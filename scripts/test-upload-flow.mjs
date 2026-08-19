// Test de extremo a extremo del pipeline de subida/importación.
// Crea un usuario de prueba, lo promueve a admin, sube MP3 vía storage
// (igual que hace el cliente), los importa por /api/admin/import, comprueba
// duplicados, artista manual y fichero sin etiquetas, y limpia todo.
//
// Uso: node scripts/test-upload-flow.mjs
// Requisitos: dev server en :3000 y migraciones 0002 + 0003 aplicadas.
import { readFileSync } from 'node:fs'
import { randomUUID, createHash } from 'node:crypto'

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
const ref = url.match(/https:\/\/([\w-]+)\.supabase\.co/)?.[1]
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = env.SUPABASE_SERVICE_ROLE_KEY
const base = 'http://localhost:3000'

if (!ref) {
  console.error('❌ No se pudo extraer el ref del proyecto desde la URL')
  process.exit(1)
}

const EMAIL = `test-import-${Date.now()}@sona.local`
const PASS = 'TestImport123!'
const COOKIE = `sb-${ref}-auth-token`

const svc = { apikey: service, Authorization: `Bearer ${service}` }
const anonH = { apikey: anon, Authorization: `Bearer ${anon}` }

async function json(res) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

const trackIds = []
let userId = null

async function cleanup() {
  console.log('\n— Limpieza —')
  try {
    if (trackIds.length) {
      const del = await fetch(`${url}/rest/v1/tracks?id=in.(${trackIds.join(',')})`, {
        method: 'DELETE',
        headers: svc,
      })
      console.log(`tracks → ${del.status}`)
    }
    for (const name of ['Álbum Prueba', 'Otro Álbum']) {
      const del = await fetch(`${url}/rest/v1/albums?title=eq.${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: svc,
      })
      console.log(`álbum «${name}» → ${del.status}`)
    }
    for (const name of ['Artista Prueba', 'Artista Manual', 'Artista desconocido']) {
      const del = await fetch(`${url}/rest/v1/artists?name=eq.${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: svc,
      })
      console.log(`artista «${name}» → ${del.status}`)
    }
    for (const fname of ['test-cancion.mp3', 'test-otra.mp3', 'test-sin-artista.mp3']) {
      const del = await fetch(
        `${url}/rest/v1/uploads?filename=eq.${encodeURIComponent(fname)}`,
        { method: 'DELETE', headers: svc }
      )
      console.log(`uploads ${fname} → ${del.status}`)
    }
    if (userId) {
      const delUser = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: svc,
      })
      console.log(`usuario de prueba → ${delUser.status}`)
    }
  } catch (e) {
    console.log('(no crítico)', e.message)
  }
}

async function uploadAndImport({ path, file, filename, artist }) {
  const upload = await fetch(`${url}/storage/v1/object/audio/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'audio/mpeg',
    },
    body: file,
  })
  if (!upload.ok) {
    const t = await upload.text()
    console.error(`❌ Subida rechazada (${upload.status}): ${t}`)
    return null
  }
  const sha256 = createHash('sha256').update(file).digest('hex')
  const res = await json(
    await fetch(`${base}/api/admin/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `${COOKIE}=${cookieValue}` },
      body: JSON.stringify({
        path,
        sha256,
        size: file.length,
        mime: 'audio/mpeg',
        filename,
        ...(artist ? { artist } : {}),
      }),
    })
  )
  return res
}

let session
let cookieValue

async function main() {
  console.log(`Proyecto: ${url}\n`)

  // 1. Crear usuario de prueba y promoverlo a admin
  console.log('— 1. Usuario de prueba —')
  const created = await json(
    await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { ...svc, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: EMAIL,
        password: PASS,
        email_confirm: true,
        user_metadata: { full_name: 'Prueba Técnica' },
      }),
    })
  )
  if (!created.id) {
    console.error(`❌ No se pudo crear el usuario: ${created.message ?? JSON.stringify(created)}`)
    process.exit(1)
  }
  userId = created.id
  console.log(`usuario creado → ${created.email}`)

  // El trigger handle_new_user crea el perfil como 'user' y el guard
  // bloquea el UPDATE de rol, así que para el test reemplazamos el perfil
  // (DELETE + INSERT directos con service role, que sortea el guard).
  const delProfile = await fetch(`${url}/rest/v1/profiles?id=eq.${created.id}`, {
    method: 'DELETE',
    headers: svc,
  })
  console.log(`perfil auto eliminado → ${delProfile.status}`)
  const insProfile = await fetch(`${url}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...svc, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: created.id, username: 'testadmin', role: 'admin' }),
  })
  console.log(`perfil admin insertado → ${insProfile.status}`)
  const insSettings = await fetch(`${url}/rest/v1/user_settings`, {
    method: 'POST',
    headers: { ...svc, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: created.id }),
  })
  console.log(`settings insertadas → ${insSettings.status}`)
  if (insProfile.status !== 201) {
    console.error('❌ No se pudo crear el perfil admin')
    await cleanup()
    process.exit(1)
  }

  // 2. Login para obtener sesión como el usuario de prueba
  console.log('\n— 2. Login —')
  session = await json(
    await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { ...anonH, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASS }),
    })
  )
  if (!session.access_token) {
    console.error('❌ Login fallido')
    await cleanup()
    process.exit(1)
  }
  cookieValue = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  console.log('sesión obtenida OK')

  // 3. Caso A: MP3 con tags completos → artista extraído del MP3
  console.log('\n— 3. Tags completos (artista del MP3) —')
  const fileA = readFileSync('scripts/test-cancion.mp3')
  const resA = await uploadAndImport({
    path: `tracks/${randomUUID()}.mp3`,
    file: fileA,
    filename: 'test-cancion.mp3',
  })
  console.log(`import → ${JSON.stringify(resA)}`)
  if (!resA?.ok) {
    console.error('❌ Fallo en el caso A')
    await cleanup()
    process.exit(1)
  }
trackIds.push(resA.track.id)
  const trackARes = await fetch(
    `${url}/rest/v1/tracks?id=eq.${resA.track.id}&select=*,artist:artist_id(name),album_ref:album_id(title,cover_url),genre:genre_id(name)`,
    { headers: svc }
  )
  const trackARaw = await trackARes.text()
  console.log(`verificación cruda → ${trackARes.status} ${trackARaw}`)
  const trackA = JSON.parse(trackARaw)
  const artistFromTag = trackA[0]?.artist?.name
  console.log(`artista resultante → «${artistFromTag}»`)
  if (artistFromTag !== 'Artista Prueba') {
    console.error('❌ El artista no se extrajo del MP3')
    await cleanup()
    process.exit(1)
  }
  const albumId = trackA[0]?.album_id // columna FK (uuid)
  const cover = albumId
    ? await fetch(`${url}/storage/v1/object/info/covers/albums/${albumId}.png`, {
        headers: anonH,
      })
    : null
  console.log(`portada en storage → ${cover ? (cover.ok ? 'OK' : 'ERR ' + cover.status) : 'n/a'}`)

  // 4. Caso B: duplicado por hash → rechazado
  console.log('\n— 4. Duplicado —')
  const dupPath = `tracks/${randomUUID()}.mp3`
  const dupRes = await uploadAndImport({
    path: dupPath,
    file: fileA,
    filename: 'test-cancion.mp3',
  })
  console.log(`duplicado → status=${dupRes?.status} error=${dupRes?.error}`)
  if (dupRes?.status !== 'duplicate') {
    console.error('❌ No se detectó el duplicado')
    await cleanup()
    process.exit(1)
  }
  const cleanRes = await json(
    await fetch(`${base}/api/admin/cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `${COOKIE}=${cookieValue}` },
      body: JSON.stringify({ path: dupPath }),
    })
  )
  console.log(`cleanup huérfano → ${JSON.stringify(cleanRes)}`)

  // 5. Caso C: artista manual tiene prioridad sobre la etiqueta
  console.log('\n— 5. Artista manual (override) —')
  const fileC = readFileSync('scripts/test-otra.mp3')
  const resC = await uploadAndImport({
    path: `tracks/${randomUUID()}.mp3`,
    file: fileC,
    filename: 'test-otra.mp3',
    artist: 'Artista Manual',
  })
  console.log(`import → ${JSON.stringify(resC)}`)
  if (!resC?.ok) {
    console.error('❌ Fallo en el caso C')
    await cleanup()
    process.exit(1)
  }
  trackIds.push(resC.track.id)
  const trackC = await json(
    await fetch(`${url}/rest/v1/tracks?id=eq.${resC.track.id}&select=artist_id(name)`, {
      headers: svc,
    })
  )
  const artistOverride = trackC[0]?.artist_id?.name
  console.log(`artista resultante → «${artistOverride}» (la etiqueta decía «Segundo Artista»)`)
  if (artistOverride !== 'Artista Manual') {
    console.error('❌ El override de artista no se aplicó')
    await cleanup()
    process.exit(1)
  }

  // 6. Caso D: MP3 sin artista ni álbum → fallback + importación correcta
  console.log('\n— 6. Sin etiquetas (fallback) —')
  const fileD = readFileSync('scripts/test-sin-artista.mp3')
  const resD = await uploadAndImport({
    path: `tracks/${randomUUID()}.mp3`,
    file: fileD,
    filename: 'test-sin-artista.mp3',
  })
  console.log(`import → ${JSON.stringify(resD)}`)
  if (!resD?.ok) {
    console.error('❌ Fallo en el caso D')
    await cleanup()
    process.exit(1)
  }
  trackIds.push(resD.track.id)
  const trackD = await json(
    await fetch(`${url}/rest/v1/tracks?id=eq.${resD.track.id}&select=title,artist_id(name),album_id(id)`, {
      headers: svc,
    })
  )
  console.log(`resultado → ${JSON.stringify(trackD[0])}`)
  if (trackD[0]?.artist_id?.name !== 'Artista desconocido' || trackD[0]?.album_id !== null) {
    console.error('❌ El fallback sin etiquetas no funcionó como se esperaba')
    await cleanup()
    process.exit(1)
  }

  console.log('\n✅ Pipeline completo correcto (4 casos OK)')
  await cleanup()
}

main().catch(async (e) => {
  console.error('Error inesperado:', e)
  await cleanup()
  process.exit(1)
})