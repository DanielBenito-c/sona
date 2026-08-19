import 'server-only'
import { SupabaseStorageProvider } from './supabase-storage'
import { getAdminClient } from '@/lib/supabase/admin'
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

export interface StorageUsage {
  audioBytes: number
  coversBytes: number
  totalBytes: number
}

// Suma el tamaño real de los objetos de los buckets (audio + portadas),
// recorriendo carpetas de forma recursiva con paginación. Usa el cliente
// admin (solo servidor).
export async function getStorageUsage(): Promise<StorageUsage> {
  const admin = getAdminClient()
  const usage: StorageUsage = { audioBytes: 0, coversBytes: 0, totalBytes: 0 }
  for (const bucket of [BUCKETS.audio, BUCKETS.covers]) {
    let bytes = 0
    const walk = async (prefix: string) => {
      let offset = 0
      for (;;) {
        const { data, error } = await admin.storage.from(bucket).list(prefix, {
          limit: 1000,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        })
        if (error) break
        for (const f of data ?? []) {
          if (f.metadata?.size != null) bytes += f.metadata.size
          else if (f.id === null) await walk(prefix ? `${prefix}/${f.name}` : f.name)
        }
        if (!data || data.length < 1000) break
        offset += 1000
      }
    }
    await walk('')
    if (bucket === BUCKETS.audio) usage.audioBytes = bytes
    else usage.coversBytes = bytes
  }
  usage.totalBytes = usage.audioBytes + usage.coversBytes
  return usage
}

export type { StorageProvider, StorageUploadOptions, SignedUrlOptions } from './types'