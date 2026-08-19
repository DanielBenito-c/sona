import type { ProfileRow } from './database'

export type Profile = ProfileRow

export interface AuthUser {
  id: string
  email: string
  profile: Profile | null
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

// Acciones de autenticación expuestas por el AuthProvider
export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}