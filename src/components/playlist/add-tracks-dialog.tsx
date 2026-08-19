'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Plus, Search as SearchIcon, X } from 'lucide-react'
import { addTrackToPlaylist } from '@/lib/playlists'
import { formatArtists } from '@/lib/utils'
import { Cover } from '@/components/library/cover'
import type { LibraryTrack } from '@/components/library/track-row'

// Diálogo para buscar canciones y añadirlas a una playlist. Se monta
// condicionalmente desde el padre (el estado se reinicia al desmontar).
interface Props {
  onClose: () => void
  playlistId: string
  existingTrackIds: Set<string>
  onAdded: () => void
}

export function AddTracksDialog({ onClose, playlistId, existingTrackIds, onAdded }: Props) {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<LibraryTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`, {
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = await res.json()
        if (!controller.signal.aborted) setTracks(data.tracks ?? [])
      } catch {
        // ignorado (abortada o red)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const visibleTracks = query.trim().length < 2 ? [] : tracks
  const isInPlaylist = (id: string) => existingTrackIds.has(id) || addedIds.has(id)

  async function handleAdd(track: LibraryTrack) {
    setError(null)
    const result = await addTrackToPlaylist(playlistId, track.id)
    if (!result.ok) {
      setError(result.error ?? 'No se pudo añadir la canción.')
      return
    }
    setAddedIds((prev) => new Set(prev).add(track.id))
    onAdded()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Añadir canciones"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        className="flex h-[85dvh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-surface p-4 md:h-auto md:max-h-[80dvh] md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Añadir canciones</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 text-muted transition-colors hover:text-foreground"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div className="relative mb-3">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar canciones…"
            autoFocus
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-10 text-foreground placeholder:text-muted/60 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          {loading && (
            <Loader2
              aria-hidden
              className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-accent"
            />
          )}
        </div>

        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibleTracks.length === 0 && !loading && (
            <p className="py-8 text-center text-sm text-muted">
              {query.trim().length < 2
                ? 'Escribe al menos 2 caracteres para buscar.'
                : 'Sin resultados.'}
            </p>
          )}
          <div className="flex flex-col gap-1">
            {visibleTracks.map((track) => {
              const added = isInPlaylist(track.id)
              return (
                <div
                  key={track.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-hover/60"
                >
                  <Cover
                    src={track.cover_url ?? track.album?.cover_url}
                    alt=""
                    className="size-10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{track.title}</p>
                    <p className="truncate text-xs text-muted">{formatArtists(track)}</p>
                  </div>
                  {added ? (
                    <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-accent">
                      <Check aria-hidden className="size-4" />
                      En la lista
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAdd(track)}
                      aria-label={`Añadir ${track.title}`}
                      className="rounded-full border border-border p-2 text-muted transition-colors hover:border-accent/60 hover:text-accent"
                    >
                      <Plus aria-hidden className="size-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}