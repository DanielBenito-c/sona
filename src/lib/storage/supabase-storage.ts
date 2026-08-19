import 'server-only'
import { getAdminClient } from '@/lib/supabase/admin'
import type {
  SignedUrlOptions,
  StorageMetadata,
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
} from './types'

// Implementación Supabase Storage (bucket privado 'audio', público 'covers').
// Requiere el cliente admin (service role) para firmar URLs y gestionar
// objetos. Los límites MIME/tamaño se definen en el bucket (ver migración).

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = 'supabase'

  async upload(
    bucket: string,
    path: string,
    file: Blob | ArrayBuffer | Uint8Array,
    contentType: string,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    const { error } = await getAdminClient().storage.from(bucket).upload(path, file, {
      contentType,
      upsert: options?.upsert ?? false,
    })
    if (error) throw new Error(`Storage upload failed: ${error.message}`)
    const size =
      file instanceof Blob ? file.size : (file as ArrayBuffer | Uint8Array).byteLength ?? 0
    return { path, size }
  }

  async delete(bucket: string, path: string): Promise<void> {
    const { error } = await getAdminClient().storage.from(bucket).remove([path])
    if (error) throw new Error(`Storage delete failed: ${error.message}`)
  }

  async list(bucket: string, prefix: string): Promise<string[]> {
    const { data, error } = await getAdminClient().storage.from(bucket).list(prefix, {
      limit: 1000,
    })
    if (error) throw new Error(`Storage list failed: ${error.message}`)
    return data.map((f) => `${prefix}/${f.name}`)
  }

  async getSignedUrl(bucket: string, path: string, options?: SignedUrlOptions): Promise<string> {
    const { data, error } = await getAdminClient().storage
      .from(bucket)
      .createSignedUrl(path, options?.expiresIn ?? 3600, {
        download: options?.download ? options.fileName ?? path.split('/').pop() : undefined,
      })
    if (error) throw new Error(`Signed URL failed: ${error.message}`)
    return data.signedUrl
  }

  getPublicUrl(bucket: string, path: string): string {
    return getAdminClient().storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  async getMetadata(bucket: string, path: string): Promise<StorageMetadata | null> {
    const { data, error } = await getAdminClient().storage.from(bucket).info(path)
    if (error) return null
    return {
      size: data.size ?? 0,
      mimeType: data.metadata?.mimetype ?? '',
      createdAt: data.createdAt ?? '',
      updatedAt: data.updatedAt ?? '',
      cacheControl: data.metadata?.cacheControl,
    }
  }
}