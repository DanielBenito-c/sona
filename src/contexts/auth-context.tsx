'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getBrowserClient } from '@/lib/supabase/client'
import type { AuthContextValue, AuthStatus, AuthUser } from '@/types/user'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)

  const refresh = useCallback(async () => {
    const supabase = getBrowserClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      setUser(null)
      setStatus('unauthenticated')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()

    if (profile?.is_blocked) {
      setUser(null)
      setStatus('unauthenticated')
      return
    }

    setUser({
      id: authUser.id,
      email: authUser.email ?? '',
      profile,
    })
    setStatus('authenticated')
  }, [])

  useEffect(() => {
    const supabase = getBrowserClient()

    async function init() {
      await refresh()
    }
    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null)
        setStatus('unauthenticated')
      } else {
        refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [refresh])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? friendlyAuthError(error.message) : null }
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const supabase = getBrowserClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: fullName },
      },
    })
    return { error: error ? friendlyAuthError(error.message) : null }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getBrowserClient()
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAdmin: user?.profile?.role === 'admin',
      signIn,
      signUp,
      signOut,
      refresh,
    }),
    [status, user, signIn, signUp, signOut, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) return 'Email o contraseña incorrectos'
  if (lower.includes('email not confirmed')) return 'Confirma tu email antes de entrar (revisa tu correo)'
  if (lower.includes('user already registered')) return 'Ya existe una cuenta con ese email'
  if (lower.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres'
  if (lower.includes('rate limit')) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo'
  return 'Algo salió mal. Inténtalo de nuevo'
}