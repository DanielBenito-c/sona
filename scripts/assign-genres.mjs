// Asigna géneros a toda la biblioteca a partir del mapeo compartido
// (src/lib/genre-mapping.ts). Idempotente: se puede re-ejecutar.
// Además regenera search_text para que la búsqueda incluya el género.
import { readFileSync, writeFileSync } from 'node:fs'
import { genreForTrack, normalizeGenreName } from '../src/lib/genre-mapping.ts'

const env = readFileSync('.env.local', 'utf8')
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim() ?? ''
const SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL')
const SERVICE_KEY = get('SUPABASE_SERVICE_ROLE_KEY')
const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }

async function main() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/tracks?select=id,title,artist:artist_id(name),album:album_id(title),genre_id&limit=1000`,
    { headers }
  )
  const tracks = await res.json()
  console.log(`tracks: ${tracks.length}`)

  const byGenre = new Map()
  const unmatched = []

  for (const t of tracks) {
    const genre = genreForTrack({ title: t.title, artistName: t.artist?.name ?? '' })
    if (!genre) {
      unmatched.push(`${t.title} — ${t.artist?.name ?? '?'}`)
      continue
    }
    byGenre.set(genre, [...(byGenre.get(genre) ?? []), t])
  }

  if (unmatched.length > 0) {
    console.log('SIN GÉNERO ASIGNADO:')
    for (const u of unmatched) console.log(`  ${u}`)
    process.exitCode = 1
    return
  }

  console.log('Géneros:')
  for (const [genre, list] of byGenre) console.log(`  ${genre}: ${list.length} canciones`)

  // Crea los géneros que falten y asigna genre_id + search_text.
  const genreIds = new Map()
  for (const name of byGenre.keys()) {
    const existing = await (
      await fetch(`${SUPABASE_URL}/rest/v1/genres?select=id,name&name=eq.${encodeURIComponent(name)}`, { headers })
    ).json()
    if (existing[0]) {
      genreIds.set(name, existing[0].id)
      continue
    }
    const created = await (
      await fetch(`${SUPABASE_URL}/rest/v1/genres`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ name }),
      })
    ).json()
    if (!created[0]?.id) throw new Error(`no se pudo crear el género ${name}`)
    genreIds.set(name, created[0].id)
  }

  let updated = 0
  for (const [genre, list] of byGenre) {
    const gid = genreIds.get(genre)
    for (const t of list) {
      const artistNames = [t.artist?.name ?? '']
      const searchText = [t.title, ...artistNames, t.album?.title ?? '', genre]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const r = await fetch(`${SUPABASE_URL}/rest/v1/tracks?id=eq.${t.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ genre_id: gid, search_text: searchText }),
      })
      if (!r.ok) throw new Error(`fallo al actualizar ${t.title}: ${r.status}`)
      updated++
    }
  }
  console.log(`\nactualizadas: ${updated} canciones`)

  // Genera la migración SQL para bases nuevas (mismos datos). Se lista cada
// canción por título para que coincida exactamente con la asignación real.
  const q = (s) => `'${s.replace(/'/g, "''")}'`
  const sql = []
  sql.push('-- Géneros de la biblioteca (asignación automática por artista).')
  sql.push('insert into public.genres (name) values')
  sql.push([...byGenre.keys()].map((n) => `  (${q(n)})`).join(',\n') + ' on conflict (name) do nothing;')
  sql.push('')
  sql.push('-- Asigna género a cada canción según su título.')
  sql.push('update public.tracks t set genre_id = g.id,')
  sql.push("  search_text = lower(concat_ws(' ', t.title, a.name, al.title, g.name))")
  sql.push('from public.genres g')
  sql.push('left join public.artists a on a.id = t.artist_id')
  sql.push('left join public.albums al on al.id = t.album_id')
  sql.push('where t.genre_id is null and (')
  const ors = []
  for (const [genre, list] of byGenre) {
    const titles = [...new Set(list.map((t) => t.title))]
    ors.push(
      `  (g.name = ${q(genre)} and lower(t.title) in (${titles.map((n) => q(normalize(n))).join(', ')}))`
    )
  }
  sql.push(ors.join(' or\n'))
  sql.push(');')
  writeFileSync('supabase/migrations/0006_genres.sql', sql.join('\n') + '\n')
  console.log('\nmigración escrita: supabase/migrations/0006_genres.sql')
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})