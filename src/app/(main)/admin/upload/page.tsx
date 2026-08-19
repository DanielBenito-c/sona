'use client'

import { useCallback, useRef, useState } from 'react'
import { CheckCircle2, CircleX, FileMusic, Loader2, UploadCloud, X } from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase/client'
import { cn, formatBytes } from '@/lib/utils'
import { AdminNav } from '@/components/admin/admin-nav'

const ACCEPTED = [
  'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/x-flac',
  'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/ogg', 'application/ogg', 'audio/x-m4a',
]
const ACCEPTED_EXT = /\.(mp3|flac|m4a|aac|ogg)$/i
const MAX_SIZE = 100 * 1024 * 1024

type FileStatus = 'queued' | 'uploading' | 'importing' | 'done' | 'duplicate' | 'error' | 'cancelled'

interface UploadItem {
  id: string
  file: File
  status: FileStatus
  progress: number
  message: string
  artist?: string
  xhr?: XMLHttpRequest
}

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default function AdminUploadPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<UploadItem[]>([])
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }, [])

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const valid: UploadItem[] = []
      for (const file of Array.from(files)) {
        const isAccepted = ACCEPTED.includes(file.type) || ACCEPTED_EXT.test(file.name)
        if (!isAccepted || file.size > MAX_SIZE) {
          valid.push({
            id: crypto.randomUUID(),
            file,
            status: 'error',
            progress: 0,
            message: !isAccepted
              ? 'Formato no soportado (MP3, FLAC, M4A/AAC, OGG)'
              : `Demasiado grande (${formatBytes(file.size)} > 100 MB)`,
          })
          continue
        }
        valid.push({ id: crypto.randomUUID(), file, status: 'queued', progress: 0, message: 'En cola' })
      }
      setItems((prev) => [...prev, ...valid])
    },
    []
  )

  async function processItem(item: UploadItem) {
    const supabase = getBrowserClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      updateItem(item.id, { status: 'error', message: 'Sesión caducada' })
      return
    }

    // --- 1. Hash para detectar duplicados --------------------------------
    updateItem(item.id, { status: 'importing', message: 'Calculando hash…' })
    const buffer = await item.file.arrayBuffer()
    const hash = await sha256(buffer)
    const ext = item.file.name.split('.').pop()!.toLowerCase()
    const path = `tracks/${crypto.randomUUID()}.${ext}`

    // --- 2. Subida directa a storage (XHR → progreso y cancelar) ---------
    const xhr = new XMLHttpRequest()
    updateItem(item.id, { status: 'uploading', progress: 0, message: 'Subiendo…', xhr })

    const uploadPromise = new Promise<string>((resolve, reject) => {
      xhr.open('POST', `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/audio/${path}`)
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
      xhr.setRequestHeader('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      xhr.setRequestHeader('Content-Type', item.file.type || 'application/octet-stream')
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100)
          updateItem(item.id, { progress: pct })
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(path)
        else reject(new Error(xhr.responseText || `Error de subida (${xhr.status})`))
      }
      xhr.onerror = () => reject(new Error('Error de red durante la subida'))
      xhr.onabort = () => reject(new Error('aborted'))
      xhr.send(buffer)
    })

    let uploadedPath: string | null = null
    try {
      uploadedPath = await uploadPromise
      updateItem(item.id, { status: 'importing', progress: 100, message: 'Importando metadatos…' })

      // --- 3. Importación server-side (metadatos + registros) -------------
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: uploadedPath,
          sha256: hash,
          size: item.file.size,
          mime: item.file.type,
          filename: item.file.name,
          ...(item.artist?.trim() ? { artist: item.artist.trim() } : {}),
        }),
      })
      const data = await res.json()

      if (res.ok && data.ok) {
        updateItem(item.id, {
          status: 'done',
          progress: 100,
          message: data.message,
        })
      } else if (data?.status === 'duplicate') {
        updateItem(item.id, { status: 'duplicate', progress: 100, message: data.error })
      } else {
        updateItem(item.id, { status: 'error', progress: 100, message: data?.error ?? 'Error de importación' })
      }
    } catch (e) {
      const aborted = e instanceof Error && e.message === 'aborted'
      updateItem(item.id, {
        status: aborted ? 'cancelled' : 'error',
        message: aborted ? 'Cancelado' : e instanceof Error ? e.message : 'Error inesperado',
      })
      // Limpieza: el fichero llegó a storage pero no se pudo importar
      if (uploadedPath && !aborted) {
        fetch('/api/admin/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: uploadedPath }),
        }).catch(() => undefined)
      }
    }
  }

  async function startQueue() {
    setProcessing(true)
    const queue = items.filter((it) => it.status === 'queued')
    for (const item of queue) {
      const current = items.find((i) => i.id === item.id)
      if (current?.status !== 'queued') continue
      await processItem(item)
    }
    setProcessing(false)
  }

  function cancelItem(id: string) {
    const item = items.find((i) => i.id === id)
    item?.xhr?.abort()
    if (item?.status === 'queued') updateItem(id, { status: 'cancelled', message: 'Cancelado' })
  }

  function clearFinished() {
    setItems((prev) => prev.filter((it) => ['queued', 'uploading', 'importing'].includes(it.status)))
  }

  const stats = {
    queued: items.filter((i) => i.status === 'queued').length,
    done: items.filter((i) => i.status === 'done').length,
    dup: items.filter((i) => i.status === 'duplicate').length,
    errors: items.filter((i) => i.status === 'error').length,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold md:text-3xl">Subir música</h1>
        <AdminNav />
      </div>

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Subir archivos de audio"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          addFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors',
          dragging ? 'border-accent bg-accent/10' : 'border-border bg-surface/40 hover:border-accent/60'
        )}
      >
        <UploadCloud className={cn('size-10', dragging ? 'text-accent' : 'text-muted')} />
        <div>
          <p className="font-medium">Arrastra tus canciones aquí</p>
          <p className="text-sm text-muted">o toca para elegir archivos</p>
        </div>
        <p className="text-xs text-muted">MP3 · FLAC · M4A/AAC · OGG — máx. 100 MB por archivo</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {/* Resumen */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-surface-hover px-3 py-1">
            {stats.queued} en cola
          </span>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-400">
            {stats.done} importadas
          </span>
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-400">
            {stats.dup} duplicadas
          </span>
          <span className="rounded-full bg-red-500/10 px-3 py-1 text-red-400">
            {stats.errors} con error
          </span>
          <div className="ml-auto flex gap-2">
            {stats.queued > 0 && (
              <button
                type="button"
                onClick={startQueue}
                disabled={processing}
                className="rounded-xl bg-gradient-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {processing ? 'Importando…' : `Importar ${stats.queued} canción${stats.queued > 1 ? 'es' : ''}`}
              </button>
            )}
            <button
              type="button"
              onClick={clearFinished}
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Limpiar terminadas
            </button>
          </div>
        </div>
      )}

      {/* Lista de archivos */}
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface/50 p-3"
          >
            <FileMusic className="size-6 shrink-0 text-muted" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.file.name}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                {formatBytes(item.file.size)} ·{' '}
                <StatusLabel status={item.status} message={item.message} />
              </p>
              {item.status === 'queued' && (
                <input
                  type="text"
                  value={item.artist ?? ''}
                  onChange={(e) => updateItem(item.id, { artist: e.target.value })}
                  placeholder="Artista (opcional: si el MP3 no trae etiqueta)"
                  className="mt-1.5 w-full max-w-xs rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted focus:border-accent"
                />
              )}
              {['uploading', 'importing'].includes(item.status) && (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="bg-gradient-brand h-full rounded-full transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
            </div>
            {item.status === 'uploading' ? (
              <button
                type="button"
                onClick={() => cancelItem(item.id)}
                aria-label="Cancelar subida"
                className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-red-400"
              >
                <X className="size-4" />
              </button>
            ) : (
              <StatusIcon status={item.status} />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function StatusLabel({ status, message }: { status: FileStatus; message: string }) {
  const color = {
    queued: 'text-muted',
    uploading: 'text-accent',
    importing: 'text-accent',
    done: 'text-emerald-400',
    duplicate: 'text-amber-400',
    error: 'text-red-400',
    cancelled: 'text-muted',
  }[status]
  return <span className={color}>{message}</span>
}

function StatusIcon({ status }: { status: FileStatus }) {
  if (status === 'done') return <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
  if (status === 'duplicate') return <CircleX className="size-5 shrink-0 text-amber-400" />
  if (status === 'error') return <CircleX className="size-5 shrink-0 text-red-400" />
  if (status === 'uploading' || status === 'importing')
    return <Loader2 className="size-5 shrink-0 animate-spin text-accent" />
  return null
}