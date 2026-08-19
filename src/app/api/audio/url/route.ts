import { NextResponse, type NextRequest } from 'next/server'
import { requireUserOrThrow } from '@/lib/auth'
import { getStorageProvider, BUCKETS } from '@/lib/storage'

// GET /api/audio/url?path=tracks/<uuid>.mp3
// Devuelve una URL firmada temporal para reproducir un archivo de audio.
// El bucket 'audio' es privado: el navegador no puede acceder sin una URL
// firmada. El cliente cachea la URL ~1 h y solo asigna audio.src al reproducir.
const MAX_PATH = 500

export async function GET(request: NextRequest) {
  try {
    await requireUserOrThrow()
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const path = request.nextUrl.searchParams.get('path') ?? ''
  if (!path.startsWith('tracks/') || path.length > MAX_PATH || path.includes('..')) {
    return NextResponse.json({ error: 'Ruta de audio no válida' }, { status: 400 })
  }

  try {
    const provider = getStorageProvider()
    const url = await provider.getSignedUrl(BUCKETS.audio, path, { expiresIn: 3600 })
    return NextResponse.json({ url, expiresAt: Date.now() + 3600 * 1000 })
  } catch (err) {
    console.error('Error al firmar URL de audio:', err)
    return NextResponse.json({ error: 'No se pudo preparar el audio' }, { status: 500 })
  }
}