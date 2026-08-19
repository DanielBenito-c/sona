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

const email = `smoke-gen-${randomUUID().slice(0, 8)}@test.local`
const created = await json(await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
  method: 'POST', headers: { ...svc, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: 'SmokeTest!2026', email_confirm: true }),
}))
const id = created.id
await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${id}`, { method: 'DELETE', headers: svc })
await fetch(`${supabaseUrl}/rest/v1/profiles`, {
  method: 'POST', headers: { ...svc, 'Content-Type': 'application/json' },
  body: JSON.stringify({ id, username: `smkgen${randomUUID().slice(0, 4)}`, role: 'admin' }),
})
const login = await json(await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { ...anonH, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: 'SmokeTest!2026' }),
}))
const headers = { Cookie: `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(login)).toString('base64url')}` }

let failures = 0
const check = (label, cond, extra = '') => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${label} ${cond ? '' : extra}`)
  if (!cond) failures++
}

// Géneros con conteos (RLS, sesión del usuario)
const genres = await json(await fetch(`${supabaseUrl}/rest/v1/genres?select=id,name,tracks(count)`, {
  headers: { apikey: anonKey, Authorization: `Bearer ${login.access_token}` },
}))
console.log(`géneros con RLS: ${genres.length}`)
for (const g of genres) console.log(`  ${g.name}: ${g.tracks?.[0]?.count}`)
const pop = genres.find((g) => g.name === 'Pop')

// Página /genre/[id]
const page = await fetch(`${url}/genre/${pop.id}`, { headers })
const html = await page.text()
check('GET /genre/[id]', page.status === 200 && html.includes('Pop') && !html.includes('Application error'), `status ${page.status}`)

// Búsqueda por género (search_text incluye el nombre del género)
const search = await json(await fetch(`${url}/api/search?q=${encodeURIComponent('pop')}`, { headers }))
check('búsqueda "pop" devuelve canciones', (search.tracks?.length ?? 0) > 0, `tracks ${search.tracks?.length}`)
check('búsqueda "pop" devuelve el género', search.genres?.some((g) => g.id === pop.id), JSON.stringify(search.genres))

// /library con la pestaña de géneros
const lib = await fetch(`${url}/library`, { headers })
check('GET /library', lib.status === 200 && (await lib.text()).includes('Géneros'))

await fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: svc })
console.log(failures === 0 ? '\n✅ géneros OK' : `\n❌ ${failures} fallos`)