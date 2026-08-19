import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdminOrThrow } from '@/lib/auth'
import { importTrackFile } from '@/services/import'

export const maxDuration = 60 // análisis de metadatos de ficheros grandes

const importSchema = z.object({
  path: z.string().min(3).max(300).regex(/^tracks\/[a-f0-9-]{36}\.[a-z0-9]+$/i),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  size: z.number().int().positive(),
  mime: z.string().min(1).max(100),
  filename: z.string().min(1).max(255),
  artist: z.string().trim().min(1).max(100).optional(),
})

export async function POST(request: NextRequest) {
  let user
  try {
    user = await requireAdminOrThrow()
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 }
    )
  }

  const result = await importTrackFile(parsed.data, user.id)
  if (!result.ok) {
    const status = result.status === 'duplicate' ? 409 : 422
    return NextResponse.json({ error: result.message, status: result.status }, { status })
  }

  return NextResponse.json(result)
}