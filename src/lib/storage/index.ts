import 'server-only'
import { SupabaseStorageProvider } from './supabase-storage'
import type { StorageProvider } from './types'

// Fábrica de StorageProvider.
// Para migrar a Cloudflare R2 / S3: implementar la interfaz y devolverla
// aquí según la variable de entorno STORAGE_PROVIDER. El resto de la app
// (servicios, API routes, uploads) no cambia.
export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER ?? 'supabase'
  switch (provider) {
    case 'supabase':
      return new SupabaseStorageProvider()
    default:
      throw new Error(`Unknown STORAGE_PROVIDER: ${provider}`)
  }
}

export const BUCKETS = {
  audio: 'audio',
  covers: 'covers',
} as const

export type { StorageProvider, StorageUploadOptions, SignedUrlOptions } from './types'