import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import {
  requireAdminOrThrow,
  adminCreateUser,
  adminSetRole,
  adminSetBlocked,
  adminDeleteUser,
} from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'

const createSchema = z.object({
  email: z.string().email('Email inválido').max(254),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(100),
  fullName: z.string().trim().max(60).optional().nullable(),
})

const actionSchema = z.object({
  userId: z.string().uuid('Usuario inválido'),
  action: z.enum(['role', 'block', 'unblock', 'delete']),
})

export async function POST(request: NextRequest) {
  try {
    await requireAdminOrThrow()
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  const { data, error } = await adminCreateUser(
    parsed.data.email,
    parsed.data.password,
    parsed.data.fullName ?? undefined
  )

  if (error) {
    const message =
      error.code === 'email_exists' || error.message?.includes('already been registered')
        ? 'Ya existe un usuario con ese email'
        : error.message ?? 'No se pudo crear el usuario'
    return NextResponse.json({ error: message }, { status: 409 })
  }

  return NextResponse.json({
    id: data?.user?.id,
    username: data?.user?.user_metadata?.username ?? parsed.data.email,
  })
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdminOrThrow()
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  const { userId, action } = parsed.data
  if (action === 'role') {
    const supabase = getAdminClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (!profile) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    const { error } = await adminSetRole(userId, profile.role === 'admin' ? 'user' : 'admin')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: 'Rol actualizado' })
  }

  if (action === 'block' || action === 'unblock') {
    const { error } = await adminSetBlocked(userId, action === 'block')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: action === 'block' ? 'Usuario bloqueado' : 'Usuario desbloqueado' })
  }

  const { error } = await adminDeleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: 'Usuario eliminado' })
}