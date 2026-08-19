import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// Cliente de servidor (Server Components / Route Handlers / Server Actions).
// Lee la sesión de las cookies de la petición; el RLS aplica con el
// usuario autenticado. NUNCA usar la service role key aquí.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ocurre cuando se llama desde un Server Component: las cookies
            // solo pueden mutarse en Route Handlers / Server Actions. El
            // refresh de sesión se hace en src/proxy.ts.
          }
        },
      },
    }
  )
}