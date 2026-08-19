// Busca fotos de artista en la API pública de Deezer (sin clave) y las
// guarda en artists.image_url. Solo toca artistas sin imagen. Idempotente.
import { readFileSync } from 'node:fs'

const env = readFileSync('.env.local', 'utf8')
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim() ?? ''
const SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL')
const SERVICE_KEY = get('SUPABASE_SERVICE_ROLE_KEY')
const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }

// Normaliza nombres para comparar ("P!nk" == "Pink", "JAŸ-Z" == "Jay-Z").
const norm = (s) =>
  (s ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

// Términos de búsqueda alternativos por artista.
const SEARCH_TERMS = {
  'P!nk': 'Pink',
  'JAŸ-Z': 'Jay-Z',
  'In A Hopeless Place': null, // etiqueta rara de Rihanna/Calvin Harris
}

// Deezer usa estos hashes como imagen por defecto (sin foto real).
const NO_IMAGE_HASH = 'd41d8cd98f00b204e9800998ecf8427e'

const hasRealImage = (url) =>
  !url.includes(NO_IMAGE_HASH) && !url.includes('/artist//') && !url.endsWith('/')

async function searchDeezer(term) {
  const res = await fetch(
    `https://api.deezer.com/search/artist?q=${encodeURIComponent(term)}&limit=10`
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.data ?? []).filter((r) => r.name && r.picture_xl && hasRealImage(r.picture_xl))
}

async function main() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/artists?select=id,name&image_url=is.null&limit=1000`, {
    headers,
  })
  const artists = await res.json()
  console.log(`artistas sin foto: ${artists.length}`)

  const done = { ok: [], notFound: [], mismatch: [] }
  let i = 0
  for (const artist of artists) {
    i++
    const term = SEARCH_TERMS[artist.name] ?? artist.name
    if (term === null) {
      done.notFound.push(artist.name)
      continue
    }
    let results
    try {
      results = await searchDeezer(term)
    } catch {
      done.notFound.push(artist.name)
      continue
    }
    const target = norm(artist.name)
    const match = results.find((r) => norm(r.name) === target) ?? results[0]
    const url = match?.picture_xl
    if (!url) {
      done.notFound.push(artist.name)
      continue
    }
    const upd = await fetch(`${SUPABASE_URL}/rest/v1/artists?id=eq.${artist.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: url }),
    })
    if (upd.ok) done.ok.push(`${artist.name} → ${match.name}`)
    else done.notFound.push(artist.name)
    await new Promise((r) => setTimeout(r, 150)) // respeta el rate limit de Deezer
  }

  console.log(`\n✔ con foto (${done.ok.length}):`)
  for (const d of done.ok) console.log(`  ${d}`)
  console.log(`\n✘ sin coincidencia (${done.notFound.length}):`)
  for (const d of done.notFound) console.log(`  ${d}`)
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})