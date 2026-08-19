// Smoke test de Fase 2: comprueba que /home, /search, /discover, /library,
// /album/[id], /artist/[id] y /api/search responden con sesión real.
// Crea un usuario temporal admin y lo elimina al terminar.
import { randomUUID } from 'node:crypto'

const url = 'http://localhost:3000'
const supabaseUrl = 'https://ypithadmseegsublhqyg.supabase.co'
const ref = 'ypithadmseegsublhqyg'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!anonKey || !svcKey) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const anonH = { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
const svc = { apikey: svcKey, Authorization: `Bearer ${svcKey}` }
const COOKIE = `sb-${ref}-auth-token`

const EMAIL = `smoke-${randomUUID().slice(0, 8)}@test.local`
const PASS = 'SmokeTest!2026'

let session
let cookieValue

async function json(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

async function createUser() {
  console.log('— 1. Crear usuario test —')
  const created = await json(
    await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { ...svc, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASS, email_confirm: true }),
    })
  )
  if (!created.id) {
    console.error('❌ No se pudo crear el usuario:', JSON.stringify(created))
    process.exit(1)
  }
  const createdId = created.id
  await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${createdId}`, { method: 'DELETE', headers: svc })
  const profile = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...svc, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: createdId, username: 'smoketest', role: 'admin' }),
  })
  await fetch(`${supabaseUrl}/rest/v1/user_settings`, {
    method: 'POST',
    headers: { ...svc, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: createdId }),
  })
  if (profile.status !== 201) {
    console.error('❌ No se pudo crear el perfil admin')
    process.exit(1)
  }
  return createdId
}

async function cleanup(userId) {
  console.log('\n— Limpieza —')
  await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, { method: 'DELETE', headers: svc })
  await fetch(`${supabaseUrl}/rest/v1/user_settings?user_id=eq.${userId}`, {
    method: 'DELETE',
    headers: svc,
  })
  const del = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: svc,
  })
  console.log(`usuario test eliminado → ${del.status}`)
}

let failures = 0
function check(label, cond, extra = '') {
  if (cond) {
    console.log(`  ✓ ${label}`)
  } else {
    console.error(`  ✗ ${label} ${extra}`)
    failures++
  }
}

const userId = await createUser()

try {
  console.log('\n— 2. Login —')
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { ...anonH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  })
  session = await json(res)
  if (!session.access_token) {
    console.error('❌ Login fallido')
    process.exit(1)
  }
  cookieValue = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  const cookie = `${COOKIE}=${cookieValue}`

  console.log('\n— 3. Páginas —')
  const pages = ['/home', '/search', '/discover', '/library']
  for (const p of pages) {
    const r = await fetch(`${url}${p}`, { headers: { Cookie: cookie } })
    const html = await r.text()
    check(`${p} → ${r.status}`, r.status === 200 && html.includes('Sona'), `(${html.length} bytes)`)
  }

  // Detalles: usa un álbum y artista reales si existen.
  const albumRes = await fetch(`${supabaseUrl}/rest/v1/albums?select=id&limit=1`, { headers: svc })
  const album = (await json(albumRes))[0]
  const artistRes = await fetch(`${supabaseUrl}/rest/v1/artists?select=id&limit=1`, { headers: svc })
  const artist = (await json(artistRes))[0]
  if (album) {
    const r = await fetch(`${url}/album/${album.id}`, { headers: { Cookie: cookie } })
    check(`/album/${album.id} → ${r.status}`, r.status === 200)
  } else {
    console.log('  – sin álbumes en BD, se omite /album/[id]')
  }
  if (artist) {
    const r = await fetch(`${url}/artist/${artist.id}`, { headers: { Cookie: cookie } })
    check(`/artist/${artist.id} → ${r.status}`, r.status === 200)
  } else {
    console.log('  – sin artistas en BD, se omite /artist/[id]')
  }

  console.log('\n— 4. /api/search —')
  const s1 = await json(
    await fetch(`${url}/api/search?q=prueba&limit=10`, { headers: { Cookie: cookie } })
  )
  check('q=prueba → shape', Array.isArray(s1.tracks) && (s1.nextCursor === null || typeof s1.nextCursor === 'string'))
  const s2 = await json(
    await fetch(`${url}/api/search?q=a`, { headers: { Cookie: cookie } })
  )
  check('q corta (1 char) → sin error', s2.tracks === undefined || Array.isArray(s2.tracks))
  const sMatch = await json(
    await fetch(`${url}/api/search?q=hardstyle&limit=10`, { headers: { Cookie: cookie } })
  )
  check('q=hardstyle → encuentra la canción real', (sMatch.tracks ?? []).length > 0)
  const s3 = await json(
    await fetch(`${url}/api/search?q=${encodeURIComponent('a'.repeat(300))}`, {
      headers: { Cookie: cookie },
    })
  )
  check('q larga → 400', typeof s3.error === 'string')

  console.log('\n— 5. Sin sesión —')
  const anon = await fetch(`${url}/home`, { redirect: 'manual' })
  check('/home sin sesión → 307', anon.status === 307)
} finally {
  await cleanup(userId)
}

if (failures > 0) {
  console.error(`\n❌ ${failures} comprobaciones fallidas`)
  process.exit(1)
}
console.log('\n✅ Smoke test de Fase 2 correcto')