import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import type { Profile } from '@/types/user'

export interface CurrentUser {
  id: string
  email: string
  profile: Profile | null
}

// Cachea la consulta dentro de la misma petición (evita N+1 de auth).
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  // Usuario bloqueado → tratar como no autenticado.
  if (profile?.is_blocked) return null

  return { id: user.id, email: user.email ?? '', profile }
})

export const requireUser = cache(async (): Promise<CurrentUser> => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
})

export const requireAdmin = cache(async (): Promise<CurrentUser> => {
  const user = await requireUser()
  if (user.profile?.role !== 'admin') redirect('/home')
  return user
})

// Para Route Handlers: lanza en lugar de redirigir.
export async function requireUserOrThrow(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function requireAdminOrThrow(): Promise<CurrentUser> {
  const user = await requireUserOrThrow()
  if (user.profile?.role !== 'admin') throw new Error('Forbidden')
  return user
}

// Gestión de usuarios con service role (solo admin). Devuelve { error } en
// lugar de lanzar para mostrarlo en el formulario.
export async function adminSetRole(userId: string, role: 'admin' | 'user') {
  const supabase = getAdminClient()
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  return { error }
}

export async function adminSetBlocked(userId: string, isBlocked: boolean) {
  const supabase = getAdminClient()
  const { error } = await supabase
    .from('profiles')
    .update({ is_blocked: isBlocked })
    .eq('id', userId)
  if (!error && isBlocked) {
    // Revoca la sesión activa del usuario bloqueado.
    await supabase.auth.admin.signOut(userId)
  }
  return { error }
}

export async function adminDeleteUser(userId: string) {
  const supabase = getAdminClient()
  const { error } = await supabase.auth.admin.deleteUser(userId)
  return { error }
}

export async function adminCreateUser(email: string, password: string, fullName?: string) {
  const supabase = getAdminClient()
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : {},
  })
  return { data, error }
}