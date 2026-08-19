import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireUserOrThrow } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

const profileSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Mínimo 3 caracteres')
      .max(20, 'Máximo 20 caracteres')
      .regex(/^[a-z0-9_]+$/i, 'Solo letras, números y guiones bajos'),
    full_name: z.string().trim().max(60, 'Máximo 60 caracteres').optional().nullable(),
  })
  .strict()

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUserOrThrow()
    const body = await request.json()
    const parsed = profileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .update({ username: parsed.data.username, full_name: parsed.data.full_name ?? null })
      .eq('id', user.id)
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ese nombre de usuario ya está en uso' }, { status: 409 })
      }
      return NextResponse.json({ error: 'No se pudo actualizar el perfil' }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}