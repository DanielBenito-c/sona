import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Cliente ADMIN con la service role key.
// - SOLO servidor ('server-only' impide importarlo desde el cliente).
// - Bypass total de RLS: usarlo únicamente donde el rol admin se ha
//   verificado explícitamente (ver requireAdmin en lib/auth.ts).
// - NUNCA exponer SUPABASE_SERVICE_ROLE_KEY al navegador.

let adminClient: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function getAdminClient() {
  if (!adminClient) {
    adminClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }
  return adminClient
}