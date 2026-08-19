import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Cliente del navegador. Usa cookies para la sesión.
// Este módulo SOLO puede importarse desde componentes de cliente.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton por petición de página (conveniente para hooks).
let cached: ReturnType<typeof createClient> | null = null
export function getBrowserClient() {
  if (!cached) cached = createClient()
  return cached
}