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
const json = async (res) => { const t = await res.text(); try { return JSON.parse(t) } catch { return { raw: t.slice(0, 80) } } }

const email = `smoke-stats-${randomUUID().slice(0, 8)}@test.local`
const created = await json(await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
  method: 'POST', headers: { ...svc, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: 'SmokeTest!2026', email_confirm: true }),
}))
const id = created.id
await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${id}`, { method: 'DELETE', headers: svc })
await fetch(`${supabaseUrl}/rest/v1/profiles`, {
  method: 'POST', headers: { ...svc, 'Content-Type': 'application/json' },
  body: JSON.stringify({ id, username: `smkstat${randomUUID().slice(0, 4)}`, role: 'admin' }),
})
const login = await json(await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { ...anonH, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: 'SmokeTest!2026' }),
}))
const headers = { Cookie: `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(login)).toString('base64url')}`, 'Content-Type': 'application/json' }

let failures = 0
const check = (label, cond, extra = '') => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${label} ${cond ? '' : extra}`)
  if (!cond) failures++
}

const tracks = await json(await fetch(`${supabaseUrl}/rest/v1/tracks?select=id&limit=2`, { headers: svc }))
const [t1, t2] = tracks.map((t) => t.id)

// Historial: 3 reproducciones de t1 (2 completas, una de 30 s) y 1 de t2.
// Se inserta directo con played_at antiguos (fuera de la ventana de 60 s
// del trigger de dedupe) para que todas cuenten.
const now = Date.now()
for (const [i, [track, dur, completed]] of [
  [t1, 180_000, true], [t1, 180_000, true], [t1, 30_000, false], [t2, 120_000, true],
].entries()) {
  const r = await fetch(`${supabaseUrl}/rest/v1/listening_history`, {
    method: 'POST',
    headers: { ...svc, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: id,
      track_id: track,
      played_at: new Date(now - (60_000 * (i + 2))).toISOString(),
      duration_played_ms: dur,
      completed,
    }),
  })
  check(`historial directo #${i + 1}`, r.status === 201, `status ${r.status}`)
}

const stats = await fetch(`${url}/stats`, { headers })
const html = await stats.text()
check('GET /stats 200', stats.status === 200, `status ${stats.status}`)
check('muestra reproducciones (4)', html.includes('Reproducciones') && html.includes('>4<'), '')
check('muestra minutos (9 min)', html.includes('9 min'), '')
check('muestra top canciones', html.includes('más escuchadas'), '')
check('muestra top artistas', html.includes('Top artistas'), '')
check('muestra top géneros', html.includes('Top géneros'), '')

// Limpieza
await fetch(`${supabaseUrl}/rest/v1/listening_history?user_id=eq.${id}`, { method: 'DELETE', headers: svc })
await fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: svc })
console.log(failures === 0 ? '\n✅ estadísticas OK' : `\n❌ ${failures} fallos`)