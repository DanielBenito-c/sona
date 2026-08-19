import 'server-only'
import { parseBuffer } from 'music-metadata'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAdminClient } from '@/lib/supabase/admin'
import { BUCKETS, getStorageProvider } from '@/lib/storage'
import { formatBytes } from '@/lib/utils'
import type { Database } from '@/types/database'

export interface ImportRequest {
  path: string // ruta del fichero en el bucket audio (tracks/<uuid>.<ext>)
  sha256: string
  size: number
  mime: string
  filename: string
  artist?: string // nombre de artista manual (tiene prioridad sobre el del MP3)
}

export interface ImportResult {
  ok: boolean
  status: 'created' | 'duplicate' | 'error'
  message: string
  track?: { id: string; title: string; artist: string; album: string | null; durationMs: number }
}

const MAX_SIZE = 100 * 1024 * 1024 // 100 MB (coincide con el bucket)

type AdminClient = SupabaseClient<Database>

// Busca o crea una fila por un campo único. NO usa ON CONFLICT, que
// exigiría constraints exactos en la BD; si otra petición crea la fila
// entre medias (23505), se re-consulta y se devuelve la existente.
async function findOrCreate<T extends { id: string }>(
  admin: AdminClient,
  table: 'genres' | 'artists' | 'albums',
  match: { eq: [string, string | number][] },
  insert: Record<string, unknown>
): Promise<{ row: T | null; error: { message: string } | null }> {
  let query = admin.from(table).select('id')
  for (const [col, val] of match.eq) query = query.eq(col, val)
  const { data: existing } = await query.maybeSingle()
  if (existing) return { row: existing as T, error: null }

  const { data, error } = await admin.from(table).insert(insert).select('id').single()
  if (error?.code === '23505') {
    let retry = admin.from(table).select('id')
    for (const [col, val] of match.eq) retry = retry.eq(col, val)
    const { data: again } = await retry.maybeSingle()
    if (again) return { row: again as T, error: null }
  }
  return { row: (data as T) ?? null, error: error ? { message: error.message } : null }
}

// Importa un fichero ya subido a storage:
// 1. Detecta duplicados (sha256)  2. Extrae metadatos (ID3/Vorbis/MP4)
// 3. Crea/actualiza genre·artist·album  4. Guarda portada  5. Crea el track
export async function importTrackFile(req: ImportRequest, userId: string): Promise<ImportResult> {
  if (req.size > MAX_SIZE) {
    return { ok: false, status: 'error', message: `Fichero demasiado grande (${formatBytes(req.size)} > 100 MB)` }
  }
  if (!/^[a-f0-9]{64}$/i.test(req.sha256)) {
    return { ok: false, status: 'error', message: 'Hash SHA-256 inválido' }
  }

  const admin = getAdminClient()
  const storage = getStorageProvider()

  // --- 1. Duplicados por hash -------------------------------------------
  const { data: existing } = await admin
    .from('tracks')
    .select('id, title, artist:artist_id(name), album:album_id(title)')
    .eq('custom_metadata->>file_sha256', req.sha256)
    .maybeSingle()

  if (existing) {
    // Limpieza del fichero huérfano y aviso
    await storage.delete(BUCKETS.audio, req.path).catch(() => undefined)
    return {
      ok: false,
      status: 'duplicate',
      message: `Ya existe: «${existing.title}»${existing.album ? ` (${existing.album.title})` : ''} de ${existing.artist?.name ?? '?'}`,
    }
  }

  // --- 2. Descargar y extraer metadatos --------------------------------
  const { data: fileBlob, error: dlError } = await admin.storage.from(BUCKETS.audio).download(req.path)
  if (dlError || !fileBlob) {
    return { ok: false, status: 'error', message: `No se pudo leer el fichero: ${dlError?.message ?? '?'}` }
  }

  const buffer = Buffer.from(await fileBlob.arrayBuffer())
  let meta
  try {
    meta = await parseBuffer(buffer, req.mime || undefined, { duration: true })
  } catch {
    return { ok: false, status: 'error', message: 'No se pudieron extraer metadatos (¿fichero corrupto?)' }
  }

  const common = meta.common
  // Algunos codificadores rellenan etiquetas con bytes NUL: se eliminan.
  const clean = (s: string | null | undefined) => (s ?? '').replace(/\u0000/g, '').trim()
  const title = clean(common.title) || req.filename.replace(/\.[^.]+$/, '')
  // Artista: 1) manual del admin si lo indicó, 2) etiqueta del MP3, 3) fallback
  const manualArtist = req.artist?.trim()
  const artistName = clean(manualArtist || common.artist || common.albumartist) || 'Artista desconocido'
  const albumTitle = clean(common.album)
  const genreName = clean(common.genre?.[0])
  const trackNo = common.track?.no ?? null
  const discNo = common.disk?.no ?? null
  const year = common.year ?? null
  let durationMs = Math.round((meta.format.duration ?? 0) * 1000)
  if (durationMs <= 0) durationMs = 1000 // fallback: duración desconocida

  const cover = common.picture?.[0]

  // --- 3. Buscar o crear genre / artist / album ---------------------------
  let genreId: string | null = null
  if (genreName) {
    const { row } = await findOrCreate<{ id: string }>(
      admin,
      'genres',
      { eq: [['name', genreName]] },
      { name: genreName }
    )
    genreId = row?.id ?? null
  }

  const { row: artist, error: artistErr } = await findOrCreate<{ id: string }>(
    admin,
    'artists',
    { eq: [['name', artistName]] },
    { name: artistName }
  )
  if (artistErr || !artist) {
    return { ok: false, status: 'error', message: `No se pudo crear el artista: ${artistErr?.message ?? '?'}` }
  }

  let albumId: string | null = null
  let albumCover: string | null = null
  if (albumTitle) {
    const { row: album, error: albumErr } = await findOrCreate<{ id: string; cover_url: string | null }>(
      admin,
      'albums',
      { eq: [['artist_id', artist.id], ['title', albumTitle]] },
      { title: albumTitle, artist_id: artist.id, release_year: year }
    )
    if (albumErr || !album) {
      return { ok: false, status: 'error', message: `No se pudo crear el álbum: ${albumErr?.message ?? '?'}` }
    }
    albumId = album.id
    albumCover = album.cover_url
  }

  // --- 4. Portada --------------------------------------------------------
  if (cover && cover.data && cover.data.length > 0) {
    const ext = cover.format.includes('png') ? 'png' : cover.format.includes('webp') ? 'webp' : 'jpg'
    const coverPath = albumId ? `albums/${albumId}.${ext}` : `tracks/${crypto.randomUUID()}.${ext}`
    const coverBytes = new Uint8Array(cover.data)
    const ok = await storage
      .upload(BUCKETS.covers, coverPath, coverBytes, cover.format, { upsert: false })
      .then(() => true)
      .catch(() => false)
    if (ok) {
      const url = storage.getPublicUrl(BUCKETS.covers, coverPath)
      if (albumId && !albumCover) {
        await admin.from('albums').update({ cover_url: url }).eq('id', albumId)
        albumCover = url
      } else if (!albumId) {
        albumCover = url
      }
    }
  }

  // --- 5. Crear el track -------------------------------------------------
  const { data: track, error: trackErr } = await admin
    .from('tracks')
    .insert({
      title,
      artist_id: artist.id,
      album_id: albumId,
      genre_id: genreId,
      track_number: trackNo,
      disc_number: discNo ?? 1,
      duration_ms: durationMs,
      audio_path: req.path,
      cover_url: albumCover,
      search_text: [title, artistName, albumTitle].filter(Boolean).join(' ').toLowerCase(),
      custom_metadata: {
        file_sha256: req.sha256.toLowerCase(),
        filename: req.filename,
        mime: req.mime,
        bitrate: meta.format.bitrate ?? null,
        sample_rate: meta.format.sampleRate ?? null,
        codec: meta.format.codec ?? null,
        container: meta.format.container ?? null,
      },
    })
    .select('id')
    .single()

  if (trackErr) {
    const isDuplicate = trackErr.code === '23505'
    if (isDuplicate) {
      await storage.delete(BUCKETS.audio, req.path).catch(() => undefined)
      return { ok: false, status: 'duplicate', message: 'Esa canción ya está en la biblioteca (misma posición de disco/pista)' }
    }
    return { ok: false, status: 'error', message: `No se pudo crear la canción: ${trackErr.message}` }
  }

  await admin.from('uploads').insert({
    user_id: userId,
    filename: req.filename,
    size_bytes: req.size,
    mime_type: req.mime,
    status: 'done',
    track_id: track.id,
  })

  return {
    ok: true,
    status: 'created',
    message: `«${title}» importada`,
    track: { id: track.id, title, artist: artistName, album: albumTitle || null, durationMs },
  }
}