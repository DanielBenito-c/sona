// Interfaz de almacenamiento de objetos.
// La aplicación solo depende de esta interfaz: sustituir Supabase Storage
// por Cloudflare R2 / S3 / etc. = implementar un nuevo StorageProvider y
// cambiar la fábrica en lib/storage/index.ts. El resto del código no cambia.

export type StorageUploadOptions = {
  /** Sobrescribir si el objeto ya existe */
  upsert?: boolean
  /** Callback de progreso (0-100) */
  onProgress?: (percent: number) => void
  /** Para cancelar la subida */
  signal?: AbortSignal
}

export interface StorageUploadResult {
  /** Ruta (key) del objeto en el bucket */
  path: string
  size: number
}

export interface StorageMetadata {
  size: number
  mimeType: string
  createdAt: string
  updatedAt: string
  cacheControl?: string
}

export interface SignedUrlOptions {
  /** Segundos de validez (por defecto 3600) */
  expiresIn?: number
  /** Descarga en lugar de visualización */
  download?: boolean
  /** Nombre del fichero descargado */
  fileName?: string
}

export interface StorageProvider {
  readonly name: string
  upload(
    bucket: string,
    path: string,
    file: Blob | ArrayBuffer | Uint8Array,
    contentType: string,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResult>
  delete(bucket: string, path: string): Promise<void>
  /** Lista objetos de un prefijo (para debugging/imports) */
  list?(bucket: string, prefix: string): Promise<string[]>
  getSignedUrl(bucket: string, path: string, options?: SignedUrlOptions): Promise<string>
  getPublicUrl(bucket: string, path: string): string
  getMetadata(bucket: string, path: string): Promise<StorageMetadata | null>
}