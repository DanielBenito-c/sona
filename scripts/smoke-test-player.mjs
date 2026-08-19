// Smoke test del reproductor: URL firmada de audio (con soporte Range para
// seek), registro de historial y render de páginas con el player.
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

const EMAIL = `player-${randomUUID().slice(0, 8)}@test.local`
const PASS = 'PlayerTest!2026'

let failures = 0
function check(label, cond, extra = '') {
  if (cond) console.log(`  ✓ ${label}`)
  else {
    console.error(`  ✗ ${label} ${extra}`)
    failures++
  }
}

async function json(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

// 1. Usuario test (admin para nada en especial, solo autenticado basta)
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
const userId = created.id
await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, { method: 'DELETE', headers: svc })
const profile = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
  method: 'POST',
  headers: { ...svc, 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: userId, username: 'playertest', role: 'user' }),
})
if (profile.status !== 201) {
  console.error('❌ No se pudo crear el perfil')
  process.exit(1)
}

try {
  // 2. Login
  console.log('\n— 2. Login —')
  const session = await json(
    await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { ...anonH, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASS }),
    })
  )
  if (!session.access_token) {
    console.error('❌ Login fallido')
    process.exit(1)
  }
  const cookieValue = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  const cookie = `${COOKIE}=${cookieValue}`

  // 3. Obtener una canción real de la BD
  console.log('\n— 3. Canción real —')
  const tracks = await json(
    await fetch(`${supabaseUrl}/rest/v1/tracks?select=id,audio_path&limit=1`, { headers: svc })
  )
  const track = tracks[0]
  if (!track) {
    console.log('  – no hay canciones en la BD, se omite el test de audio')
  } else {
    console.log(`  track: ${track.id} (${track.audio_path})`)

    // 4. URL firmada
    console.log('\n— 4. /api/audio/url —')
    const signed = await json(
      await fetch(`${url}/api/audio/url?path=${encodeURIComponent(track.audio_path)}`, {
        headers: { Cookie: cookie },
      })
    )
    check('devuelve URL firmada', typeof signed.url === 'string' && signed.url.startsWith('http'))
    check('expira en ~1 h', typeof signed.expiresAt === 'number' && signed.expiresAt > Date.now())

    // 5. Streaming con Range (seek)
    console.log('\n— 5. Streaming (Range) —')
    const head = await fetch(signed.url, { method: 'HEAD', headers: { Range: 'bytes=0-' } })
    check('HEAD 200/206', head.status === 200 || head.status === 206, `(${head.status})`)
    const partial = await fetch(signed.url, { headers: { Range: 'bytes=0-1023' } })
    const buf = await partial.arrayBuffer()
    check(
      'Range 206 con 1024 bytes',
      partial.status === 206 && buf.byteLength === 1024,
      `(${partial.status}, ${buf.byteLength})`
    )
  }

  // 6. Historial
  console.log('\n— 6. /api/history —')
  const hist = await json(
    await fetch(`${url}/api/history`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_id: track.id, duration_played_ms: 31_000, completed: true }),
    })
  )
  check('registra reproducción', hist.ok === true, JSON.stringify(hist))
  const histBad = await json(
    await fetch(`${url}/api/history`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_id: 'no-es-uuid', duration_played_ms: 10 }),
    })
  )
  check('rechaza datos inválidos', typeof histBad.error === 'string')

  // 7. Sin sesión
  console.log('\n— 7. Sin sesión —')
  const anon = await fetch(`${url}/api/audio/url?path=tracks/x.mp3`, { redirect: 'manual' })
  check(
    'audio sin sesión → 307/401',
    anon.status === 307 || anon.status === 401,
    `(${anon.status})`
  )

  // 8. Páginas siguen bien
  console.log('\n— 8. Páginas —')
  for (const p of ['/home', '/queue']) {
    const r = await fetch(`${url}${p}`, { headers: { Cookie: cookie } })
    const html = await r.text()
    check(`${p} → ${r.status}`, r.status === 200 && html.includes('Sona'))
  }
} finally {
  console.log('\n— Limpieza —')
  await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, { method: 'DELETE', headers: svc })
  const del = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: svc,
  })
  console.log(`usuario test eliminado → ${del.status}`)
}

if (failures > 0) {
  console.error(`\n❌ ${failures} comprobaciones fallidas`)
  process.exit(1)
}
console.log('\n✅ Smoke test del reproductor correcto')