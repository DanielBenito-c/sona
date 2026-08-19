import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Album, Artist, EmbeddedArtist, Genre, Playlist, Track } from '@/types/music'
import { isValidUUID } from '@/lib/utils'

interface CursorPos {
  addedAt: string
  id: string
}

export function encodeCursor(addedAt: string | null, id: string): string {
  return Buffer.from(`${addedAt ?? ''}|${id}`).toString('base64url')
}

export function decodeCursor(cursor: string): CursorPos | null {
  try {
    const [addedAt, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|')
    if (!id || !isValidUUID(id)) return null
    return { addedAt, id }
  } catch {
    return null
  }
}

// Queries de biblioteca con el cliente RLS del usuario autenticado.
// Las consultas de texto usan ILIKE %…% (apoyadas en índices GIN trigram).

const TRACK_SELECT =
  'id, title, artist_id, album_id, genre_id, track_number, disc_number, duration_ms, audio_path, cover_url, lyrics, plays_count, added_at, artist:artist_id(name), artists:track_artists(position, artist:artist_id(id, name)), album:album_id(title, cover_url)'

type TrackRow = Track & {
  artist: Artist | null
  artists: EmbeddedArtist[] | null
  album: Album | null
}

// Convierte una fila cruda del select a TrackRow normalizando el embed de
// track_artists ({position, artist}) en una lista de artistas ordenada.
function toTrackRow(raw: Record<string, unknown>): TrackRow {
  const { artist, artists, album, ...rest } = raw
  const rawArtists = artists as
    | { position: number; artist: EmbeddedArtist }[]
    | null
    | undefined
  return {
    ...(rest as unknown as Track),
    artist: (artist as Artist) ?? null,
    artists:
      rawArtists?.slice().sort((a, b) => a.position - b.position).map((a) => a.artist) ?? null,
    album: (album as Album) ?? null,
  }
}

function rows(data: readonly unknown[] | null | undefined): TrackRow[] {
  return (data ?? []).map((d) => toTrackRow(d as Record<string, unknown>))
}

export async function getTracksByIds(ids: string[], limit = 100): Promise<TrackRow[]> {
  if (ids.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('tracks')
    .select(TRACK_SELECT)
    .in('id', ids)
    .limit(limit)
  return rows(data)
}

// Resuelve una lista polimórfica (recently_played / favorites) a tracks.
export async function resolveTrackItems(userId: string, itemIds: string[]): Promise<TrackRow[]> {
  if (itemIds.length === 0) return []
  const tracks = await getTracksByIds(itemIds)
  const byId = new Map(tracks.map((t) => [t.id, t]))
  return itemIds.map((id) => byId.get(id)).filter((t): t is TrackRow => Boolean(t))
}

export async function getRecentTracks(userId: string, limit = 20): Promise<TrackRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('recently_played')
    .select('item_id, played_at')
    .eq('user_id', userId)
    .eq('item_type', 'track')
    .order('played_at', { ascending: false })
    .limit(limit)
  return resolveTrackItems(userId, (data ?? []).map((r) => r.item_id))
}

export async function getFavoriteTracks(userId: string, limit = 100): Promise<TrackRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('favorites')
    .select('item_id, created_at')
    .eq('user_id', userId)
    .eq('item_type', 'track')
    .order('created_at', { ascending: false })
    .limit(limit)
  return resolveTrackItems(userId, (data ?? []).map((r) => r.item_id))
}

// Ids de tracks favoritos del usuario (para marcar corazones).
export async function getFavoriteTrackIds(userId: string, trackIds: string[]): Promise<Set<string>> {
  if (trackIds.length === 0) return new Set()
  const supabase = await createClient()
  const { data } = await supabase
    .from('favorites')
    .select('item_id')
    .eq('user_id', userId)
    .eq('item_type', 'track')
    .in('item_id', trackIds)
  return new Set((data ?? []).map((r) => r.item_id))
}

export async function getNewTracks(limit = 12): Promise<TrackRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tracks')
    .select(TRACK_SELECT)
    .order('added_at', { ascending: false })
    .limit(limit)
  return rows(data)
}

export async function getTopTracks(limit = 12): Promise<TrackRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tracks')
    .select(TRACK_SELECT)
    .order('plays_count', { ascending: false })
    .order('added_at', { ascending: false })
    .limit(limit)
  return rows(data)
}

export async function getNewAlbums(limit = 12): Promise<Album[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('albums')
    .select('id, title, artist_id, release_year, cover_url, created_at, artist:artist_id(name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as Album[]
}

export async function getAlbumsByArtist(artistId: string): Promise<Album[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('albums')
    .select('id, title, artist_id, release_year, cover_url, created_at')
    .eq('artist_id', artistId)
    .order('release_year', { ascending: false })
    .limit(100)
  return (data ?? []) as Album[]
}

export async function getArtists(limit = 12): Promise<Artist[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('artists')
    .select('id, name, image_url, bio, created_at')
    .order('created_at', { ascending: true })
    .limit(limit)
  return (data ?? []) as Artist[]
}

export async function getGenres(): Promise<Genre[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('genres')
    .select('id, name')
    .order('name', { ascending: true })
  return (data ?? []) as Genre[]
}

export interface AlbumDetail {
  album: Album
  tracks: TrackRow[]
}

// ---- Playlists --------------------------------------------------------

export interface PlaylistDetail {
  playlist: Playlist
  tracks: TrackRow[]
  track_count: number
  total_duration_ms: number
  is_owner: boolean
}

export async function getUserPlaylists(userId: string): Promise<Playlist[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('playlists')
    .select(
      'id, owner_id, name, description, cover_url, is_public, created_at, updated_at, tracks:playlist_tracks(track:track_id(duration_ms))'
    )
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []).map((p) => {
    const tracks = (p.tracks ?? []) as { track: { duration_ms: number } | null }[]
    return {
      ...p,
      track_count: tracks.length,
      total_duration_ms: tracks.reduce((acc, t) => acc + (t.track?.duration_ms ?? 0), 0),
    } as Playlist
  })
}

export async function getPlaylistDetail(
  playlistId: string,
  userId: string
): Promise<PlaylistDetail | null> {
  if (!isValidUUID(playlistId)) return null
  const supabase = await createClient()
  const { data: playlist } = await supabase
    .from('playlists')
    .select(
      'id, owner_id, name, description, cover_url, is_public, created_at, updated_at, owner:owner_id(username, full_name)'
    )
    .eq('id', playlistId)
    .maybeSingle()
  if (!playlist) return null

  const { data: links } = await supabase
    .from('playlist_tracks')
    .select('track_id, position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true })
    .limit(500)

  const trackIds = (links ?? []).map((l) => l.track_id)
  const tracks = await getTracksByIds(trackIds, 500)
  const pos = new Map((links ?? []).map((l) => [l.track_id, l.position]))
  tracks.sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0))

  return {
    playlist: playlist as Playlist,
    tracks,
    track_count: trackIds.length,
    total_duration_ms: tracks.reduce((acc, t) => acc + t.duration_ms, 0),
    is_owner: playlist.owner_id === userId,
  }
}

export async function getAlbumDetail(albumId: string): Promise<AlbumDetail | null> {
  if (!isValidUUID(albumId)) return null
  const supabase = await createClient()
  const { data: album } = await supabase
    .from('albums')
    .select('id, title, artist_id, release_year, cover_url, created_at, artist:artist_id(name)')
    .eq('id', albumId)
    .maybeSingle()
  if (!album) return null
  const { data: tracks } = await supabase
    .from('tracks')
    .select(TRACK_SELECT)
    .eq('album_id', albumId)
    .order('disc_number', { ascending: true })
    .order('track_number', { ascending: true })
  return { album: album as Album, tracks: rows(tracks) }
}

export interface ArtistDetail {
  artist: Artist
  albums: Album[]
  tracks: TrackRow[]
}

export async function getArtistDetail(artistId: string): Promise<ArtistDetail | null> {
  if (!isValidUUID(artistId)) return null
  const supabase = await createClient()
  const { data: artist } = await supabase
    .from('artists')
    .select('id, name, image_url, bio, created_at')
    .eq('id', artistId)
    .maybeSingle()
  if (!artist) return null
  const albums = await getAlbumsByArtist(artistId)
  const { data: links } = await supabase
    .from('track_artists')
    .select('track_id')
    .eq('artist_id', artistId)
    .limit(100)
  const trackIds = (links ?? []).map((l) => l.track_id)
  const tracks = await getTracksByIds(trackIds)
  tracks.sort((a, b) => (b.plays_count ?? 0) - (a.plays_count ?? 0))
  return { artist: artist as Artist, albums, tracks }
}

// ---- Búsqueda ---------------------------------------------------------

export interface SearchResults {
  tracks: TrackRow[]
  artists: Artist[]
  albums: Album[]
  genres: Genre[]
  playlists: Playlist[]
  nextCursor: string | null
}

// Paginación keyset sobre (added_at desc, id desc): definida arriba.

const GROUP_LIMITS = { artists: 6, albums: 6, genres: 6, playlists: 5 }

export async function searchLibrary(
  userId: string,
  query: string,
  cursor: string | null,
  limit = 30
): Promise<SearchResults> {
  const supabase = await createClient()
  const q = query.trim()
  const clamped = Math.min(Math.max(limit, 1), 50)

  let tracks: TrackRow[] = []
  let nextCursor: string | null = null

  type BuilderResult = { data: readonly unknown[] | null; error: { message: string } | null }

  async function fetchTracks(builder: PromiseLike<BuilderResult>) {
    const { data, error } = await builder
    tracks = rows(data)
    if (tracks.length === clamped) {
      const last = tracks[tracks.length - 1]
      nextCursor = encodeCursor(last.added_at ?? '', last.id)
    }
    return { data, error }
  }

  const keysetOr = (pos: CursorPos) =>
    `or(and(added_at.lt.${pos.addedAt}),and(added_at.eq.${pos.addedAt},id.lt.${pos.id}))`

  if (q.length >= 2) {
    // Nota: PostgREST exige paréntesis en or=(...) y no admite rutas
    // embebidas (p. ej. artist_id.name) dentro del or(); por eso se busca
    // sobre la columna denormalizada search_text (migración 0004).
    const pos = cursor ? decodeCursor(cursor) : null
    let builder = supabase
      .from('tracks')
      .select(TRACK_SELECT)
      .or(`search_text.ilike.%${q}%`)
      .order('added_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(clamped)
    if (pos) builder = builder.or(keysetOr(pos))

    const { error } = await fetchTracks(builder)

    if (error && tracks.length === 0) {
      // search_text no existe todavía (0004 sin aplicar): se degrada a
      // buscar solo por título.
      let fallback = supabase
        .from('tracks')
        .select(TRACK_SELECT)
        .or(`title.ilike.%${q}%`)
        .order('added_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(clamped)
      if (pos) fallback = fallback.or(keysetOr(pos))
      await fetchTracks(fallback)
    }
  } else {
    // Sin consulta: todo el catálogo (biblioteca).
    const pos = cursor ? decodeCursor(cursor) : null
    let builder = supabase
      .from('tracks')
      .select(TRACK_SELECT)
      .order('added_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(clamped)
    if (pos) builder = builder.or(keysetOr(pos))
    await fetchTracks(builder)
  }

  const results = await Promise.all([
    q.length >= 2
      ? supabase.from('artists').select('id, name, image_url, bio, created_at').ilike('name', `%${q}%`).limit(GROUP_LIMITS.artists)
      : Promise.resolve({ data: [] }),
    q.length >= 2
      ? supabase.from('albums').select('id, title, artist_id, release_year, cover_url, created_at, artist:artist_id(name)').ilike('title', `%${q}%`).limit(GROUP_LIMITS.albums)
      : Promise.resolve({ data: [] }),
    q.length >= 2
      ? supabase.from('genres').select('id, name').ilike('name', `%${q}%`).limit(GROUP_LIMITS.genres)
      : Promise.resolve({ data: [] }),
    q.length >= 2
      ? supabase.from('playlists').select('id, owner_id, name, description, cover_url, is_public, created_at, owner:owner_id(username, full_name)').ilike('name', `%${q}%`).limit(GROUP_LIMITS.playlists)
      : Promise.resolve({ data: [] }),
  ])

  return {
    tracks,
    artists: (results[0].data ?? []) as Artist[],
    albums: (results[1].data ?? []) as Album[],
    genres: (results[2].data ?? []) as Genre[],
    playlists: (results[3].data ?? []) as Playlist[],
    nextCursor,
  }
}