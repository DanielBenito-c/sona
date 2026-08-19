// Smoke test read-only: valida conexión Supabase, migración y storage.
// Uso: node scripts/check-setup.mjs
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey || serviceKey.includes('placeholder')) {
  console.error('❌ .env.local sin valores reales (placeholder detectado)')
  process.exit(1)
}

const h = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }

console.log(`Proyecto: ${url}\n`)

// 1. Auth API responde
const health = await fetch(`${url}/auth/v1/health`, { headers: h })
console.log(`auth/v1/health → ${health.status}`)

// 2. Tablas (consulta read-only vía REST)
const genres = await fetch(`${url}/rest/v1/genres?select=id&limit=1`, { headers: h })
console.log(`genres → ${genres.status === 200 ? 'OK' : 'ERR ' + genres.status}`)

const albums = await fetch(`${url}/rest/v1/albums?select=id&limit=1`, { headers: h })
console.log(`albums → ${albums.status === 200 ? 'OK' : 'ERR ' + albums.status}`)

const tracks = await fetch(`${url}/rest/v1/tracks?select=id&limit=1`, { headers: h })
console.log(`tracks → ${tracks.status === 200 ? 'OK' : 'ERR ' + tracks.status}`)

const playlists = await fetch(`${url}/rest/v1/playlists?select=id&limit=1`, { headers: h })
console.log(`playlists → ${playlists.status === 200 ? 'OK' : 'ERR ' + playlists.status}`)

const history = await fetch(`${url}/rest/v1/listening_history?select=id&limit=1`, { headers: h })
console.log(`listening_history → ${history.status === 200 ? 'OK' : 'ERR ' + history.status}`)

// 3. Storage buckets
const buckets = await fetch(`${url}/storage/v1/bucket`, { headers: h })
const bucketList = await buckets.json()
const audio = bucketList?.find?.((b) => b.id === 'audio')
const covers = bucketList?.find?.((b) => b.id === 'covers')
console.log(`bucket audio → ${audio ? 'OK' : 'MISSING'}`)
console.log(`bucket covers → ${covers ? 'OK' : 'MISSING'}`)

// 4. RPC reindex_playlist existe (llamada sin tocar datos: solo comprueba que la función existe)
const rpc = await fetch(`${url}/rest/v1/rpc/reindex_playlist`, {
  method: 'POST',
  headers: { ...h, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_playlist: '00000000-0000-0000-0000-000000000000' }),
})
// 404 = función no existe; 200/400/500 = existe (400/500 por uuid inexistente)
console.log(`rpc reindex_playlist → ${rpc.status === 404 ? 'MISSING' : 'OK (' + rpc.status + ')'}`)

// 5. Perfil de usuario admin (primer usuario registrado)
const profiles = await fetch(`${url}/rest/v1/profiles?select=id,username,role,is_blocked&limit=5`, {
  headers: h,
})
const profileRows = await profiles.json()
console.log(`profiles → ${profiles.status} · ${profileRows.length} usuario(s)`)
if (profileRows.length > 0) {
  console.log(profileRows.map((p) => `  @${p.username} · ${p.role}${p.is_blocked ? ' · BLOQUEADO' : ''}`).join('\n'))
}