// Smoke test de playlists: crea una lista, añade canciones, revisa la página,
// edita, borra. Crea un usuario temporal y lo elimina al terminar.
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

const env = readFileSync('.env.local', 'utf8')
const get = (k) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim() ?? ''
const url = 'http://localhost:3000'
const supabaseUrl = get('NEXT_PUBLIC_SUPABASE_URL')
const ref = 'ypithadmseegsublhqyg'
const anonKey = get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const svcKey = get('SUPABASE_SERVICE_ROLE_KEY')

const anonH = { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
const svc = { apikey: svcKey, Authorization: `Bearer ${svcKey}` }
const COOKIE = `sb-${ref}-auth-token`

const EMAIL = `smoke-pl-${randomUUID().slice(0, 8)}@test.local`
const PASS = 'SmokeTest!2026'

let cookieValue

async function json(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

// 1. Crear usuario
console.log('— 1. Crear usuario test —')
const created = await json(
  await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { ...svc, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS, email_confirm: true }),
  })
)
const createdId = created.id
if (!createdId) {
  console.error('❌ No se pudo crear el usuario:', JSON.stringify(created))
  process.exit(1)
}
await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${createdId}`, { method: 'DELETE', headers: svc })
const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
  method: 'POST',
  headers: { ...svc, 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: createdId, username: `smokepl${randomUUID().slice(0, 4)}`, role: 'admin' }),
})
if (!profileRes.ok) {
  console.error('❌ No se pudo crear el perfil:', await profileRes.text())
  process.exit(1)
}
const login = await json(
  await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { ...anonH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  })
)
if (!login.access_token) {
  console.error('❌ Login falló:', JSON.stringify(login))
  process.exit(1)
}
cookieValue = 'base64-' + Buffer.from(JSON.stringify(login)).toString('base64url')
console.log('  usuario creado y sesión OK')

const authH = { apikey: anonKey, Authorization: `Bearer ${login.access_token}` }
const headers = { Cookie: `${COOKIE}=${cookieValue}` }

// 2. Crear playlist vía RLS (como el cliente lo hace)
console.log('— 2. Crear playlist —')
const pl = await json(
  await fetch(`${supabaseUrl}/rest/v1/playlists`, {
    method: 'POST',
    headers: { ...authH, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ owner_id: createdId, name: 'Smoke Playlist', description: 'creada por el test' }),
  })
)
const plId = pl[0]?.id ?? pl?.id
if (!plId) {
  console.error('❌ No se pudo crear la playlist:', JSON.stringify(pl))
  process.exit(1)
}
console.log('  playlist:', plId)

// 3. Añadir 2 canciones existentes
console.log('— 3. Añadir canciones —')
const tracks = await json(
  await fetch(`${supabaseUrl}/rest/v1/tracks?select=id&limit=2`, { headers: authH })
)
if ((tracks ?? []).length < 2) {
  console.error('❌ No hay canciones en la BD')
  process.exit(1)
}
let pos = 1
for (const t of tracks) {
  const r = await json(
    await fetch(`${supabaseUrl}/rest/v1/playlist_tracks`, {
      method: 'POST',
      headers: { ...authH, 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlist_id: plId, track_id: t.id, position: pos++, added_by: createdId }),
    })
  )
  if (r.message) {
    console.error('❌ No se pudo añadir canción:', JSON.stringify(r))
    process.exit(1)
  }
}
console.log('  2 canciones añadidas')

// 4. GET /playlist/[id]
console.log('— 4. GET /playlist/[id] —')
const page = await fetch(`${url}/playlist/${plId}`, { headers })
console.log('  status:', page.status)
if (page.status !== 200) {
  console.error('❌ La página de playlist no responde 200')
  process.exit(1)
}

// 5. GET /library (debe contener la pestaña de listas)
console.log('— 5. GET /library —')
const lib = await fetch(`${url}/library`, { headers })
console.log('  status:', lib.status)
if (lib.status !== 200) {
  console.error('❌ /library no responde 200')
  process.exit(1)
}

// 6. Buscar la playlist por nombre (debe devolverla)
console.log('— 6. /api/search?q=smoke —')
const search = await json(
  await fetch(`${url}/api/search?q=${encodeURIComponent('smoke')}`, { headers })
)
const found = (search.playlists ?? []).some((p) => p.id === plId)
console.log('  encontrada:', found)
if (!found) {
  console.error('❌ La playlist no aparece en la búsqueda')
  process.exit(1)
}

// 7. Editar + borrar (RLS)
console.log('— 7. Editar y borrar —')
await fetch(`${supabaseUrl}/rest/v1/playlists?id=eq.${plId}`, {
  method: 'PATCH',
  headers: { ...authH, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Smoke Playlist 2' }),
})
const del = await fetch(`${supabaseUrl}/rest/v1/playlists?id=eq.${plId}`, {
  method: 'DELETE',
  headers: authH,
})
console.log('  delete status:', del.status)

// Limpieza del usuario
await fetch(`${supabaseUrl}/auth/v1/admin/users/${createdId}`, { method: 'DELETE', headers: svc })
console.log('✅ Smoke test de playlists OK')