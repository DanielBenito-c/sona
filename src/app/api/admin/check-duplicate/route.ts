import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdminOrThrow } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/check-duplicate { sha256 }
// Comprueba si un fichero ya está en la biblioteca (mismo hash) ANTES de
// subirlo a storage, para no gastar almacenamiento en duplicados.
const checkSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
})

export async function POST(request: NextRequest) {
  try {
    await requireAdminOrThrow()
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = checkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Hash inválido' }, { status: 400 })
  }

  const admin = getAdminClient()
  const { data } = await admin
    .from('tracks')
    .select('id, title, artist:artist_id(name), album:album_id(title)')
    .eq('custom_metadata->>file_sha256', parsed.data.sha256.toLowerCase())
    .maybeSingle()

  if (!data) return NextResponse.json({ duplicate: false })

  return NextResponse.json({
    duplicate: true,
    message: `Ya existe: «${data.title}»${data.album ? ` (${data.album.title})` : ''} de ${data.artist?.name ?? '?'}`,
  })
}