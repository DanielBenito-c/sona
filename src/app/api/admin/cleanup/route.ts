import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdminOrThrow } from '@/lib/auth'
import { BUCKETS, getStorageProvider } from '@/lib/storage'

const cleanupSchema = z.object({
  path: z.string().min(3).max(300).regex(/^tracks\/[a-f0-9-]{36}\.[a-z0-9]+$/i),
})

// Elimina un fichero huérfano del bucket de audio (subida fallida).
export async function POST(request: NextRequest) {
  try {
    await requireAdminOrThrow()
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = cleanupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  await getStorageProvider().delete(BUCKETS.audio, parsed.data.path).catch(() => undefined)
  return NextResponse.json({ ok: true })
}