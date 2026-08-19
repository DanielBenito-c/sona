// Genera MP3 de prueba con tags ID3v2.3 (título, artista, álbum, pista,
// año, género, portada incrustada) para validar el pipeline de importación.
// Pasa 'NONE' en artist o album para omitir esa etiqueta (archivo sin tags).
// Uso: node scripts/generate-test-mp3.mjs <output> [title] [artist] [album]
import { writeFileSync, readFileSync } from 'node:fs'

const [, , out, title = 'Canción de Prueba', artist = 'Artista Prueba', album = 'Álbum Prueba'] = process.argv

function synchsafe(n) {
  return String.fromCharCode(
    (n >> 21) & 0x7f,
    (n >> 14) & 0x7f,
    (n >> 7) & 0x7f,
    n & 0x7f
  )
}

function frame(id, data) {
  const size = data.length
  const head = Buffer.alloc(10)
  head.write(id, 0, 'latin1')
  head.writeUInt32BE(size, 4)
  return Buffer.concat([head, data])
}

function textFrame(id, text) {
  const enc = Buffer.from([0x03]) // 1 byte: encoding UTF-8 (ID3v2.3)
  return frame(id, Buffer.concat([enc, Buffer.from(text, 'utf8')]))
}

// Frames de audio: MPEG-1 Layer III, 128 kbps, 44.1 kHz, 40 frames ≈ 1 s
const audioFrames = []
for (let i = 0; i < 40; i++) {
  const f = Buffer.alloc(417)
  f[0] = 0xff
  f[1] = 0xfb
  f[2] = 0x90
  f[3] = 0x64
  audioFrames.push(f)
}

// Portada incrustada (reutiliza el icono PWA)
const picture = readFileSync('public/icons/icon-192.png')
const apic = frame('APIC', Buffer.concat([
  Buffer.from([0x03]), // encoding UTF-8
  Buffer.from('image/png\0', 'latin1'),
  Buffer.from('\0', 'latin1'), // descripción vacía
  picture,
]))

const frames = Buffer.concat([
  textFrame('TIT2', title),
  ...(artist === 'NONE' ? [] : [textFrame('TPE1', artist)]),
  ...(album === 'NONE' ? [] : [textFrame('TALB', album)]),
  textFrame('TRCK', '3'),
  textFrame('TPOS', '1'),
  textFrame('TYER', '2024'),
  textFrame('TCON', 'Pop'),
  apic,
])

const tagHeader = Buffer.alloc(10)
tagHeader.write('ID3', 0, 'latin1')
tagHeader[3] = 3 // ID3v2.3
tagHeader.write(synchsafe(frames.length), 6)

const mp3 = Buffer.concat([tagHeader, frames, ...audioFrames])
writeFileSync(out, mp3)
console.log(`OK ${out} (${mp3.length} bytes) · «${title}» de ${artist}`)