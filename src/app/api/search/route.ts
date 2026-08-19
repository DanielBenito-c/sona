import { NextResponse, type NextRequest } from 'next/server'
import { requireUserOrThrow } from '@/lib/auth'
import { searchLibrary } from '@/lib/library'

// GET /api/search?q=…&cursor=…&limit=30
// Búsqueda agrupada (canciones, artistas, álbumes, géneros, playlists)
// con paginación keyset sobre las canciones.
export async function GET(request: NextRequest) {
  let user
  try {
    user = await requireUserOrThrow()
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const q = params.get('q') ?? ''
  const cursor = params.get('cursor')
  const rawLimit = Number(params.get('limit') ?? 30)
  const limit = Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 30

  if (q.length > 100) {
    return NextResponse.json({ error: 'Búsqueda demasiado larga' }, { status: 400 })
  }

  const results = await searchLibrary(user.id, q, cursor, limit)
  return NextResponse.json(results)
}