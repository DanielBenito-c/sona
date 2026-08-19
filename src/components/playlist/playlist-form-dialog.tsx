'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createPlaylist, updatePlaylist } from '@/lib/playlists'
import { Loader2 } from 'lucide-react'

// Diálogo para crear o editar una playlist (nombre + descripción). Se monta
// condicionalmente desde el padre (el estado se reinicia al desmontar).
interface Props {
  onClose: () => void
  onSaved: () => void
  mode?: 'create' | 'edit'
  playlistId?: string
  initialName?: string
  initialDescription?: string
}

export function PlaylistFormDialog({
  onClose,
  onSaved,
  mode = 'create',
  playlistId,
  initialName = '',
  initialDescription = '',
}: Props) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setError(null)
    const result =
      mode === 'create'
        ? await createPlaylist(trimmed, description.trim() || undefined)
        : await updatePlaylist(playlistId as string, {
            name: trimmed,
            description: description.trim() || null,
          })
    setBusy(false)
    if (!result.ok) {
      setError(result.error ?? 'No se pudo guardar la lista.')
      return
    }
    setName('')
    setDescription('')
    onSaved()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'create' ? 'Crear lista' : 'Editar lista'}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-border bg-surface p-5 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {mode === 'create' ? 'Nueva lista' : 'Editar lista'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 text-muted transition-colors hover:text-foreground"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Nombre</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Mis favoritas de gym"
              autoFocus
              maxLength={80}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground placeholder:text-muted/60 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">
              Descripción <span className="text-muted/50">(opcional)</span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿De qué va esta lista?"
              rows={3}
              maxLength={300}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted/60 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || busy}
              className="flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
              {mode === 'create' ? 'Crear' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}