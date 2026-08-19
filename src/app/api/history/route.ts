import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireUserOrThrow } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/utils'

// POST /api/history
// Registra una reproducción en el historial. El trigger de la BD deduplica
// (< 60 s) e incrementa plays_count + actualiza recently_played.
const schema = z.object({
  track_id: z.string().refine(isValidUUID, 'track_id inválido'),
  duration_played_ms: z.number().int().min(0).max(86_400_000),
  completed: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  let user
  try {
    user = await requireUserOrThrow()
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.from('listening_history').insert({
    user_id: user.id,
    track_id: parsed.data.track_id,
    duration_played_ms: parsed.data.duration_played_ms,
    completed: parsed.data.completed,
  })
  if (error) {
    console.error('No se pudo registrar el historial:', error.message)
    return NextResponse.json({ error: 'No se pudo registrar el historial' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}