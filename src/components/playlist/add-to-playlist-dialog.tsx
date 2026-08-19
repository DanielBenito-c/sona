'use client'

import { useEffect, useState } from 'react'
import { Check, ListPlus, Loader2, Music2, Plus, X } from 'lucide-react'
import { addTrackToPlaylist, createPlaylist, removeTrackFromPlaylist } from '@/lib/playlists'
import { getBrowserClient } from '@/lib/supabase/client'
import { Cover } from '@/components/library/cover'
import { cn, formatArtists } from '@/lib/utils'
import type { LibraryTrack } from '@/components/library/track-row'

// Diálogo para añadir la canción actual a una o varias listas (estilo
// Spotify). Se monta condicionalmente desde el padre (el estado se reinicia
// al desmontar).
interface Props {
  track: LibraryTrack
  onClose: () => void
  onAdded?: () => void
}

interface PlaylistRow {
  id: string
  name: string
  cover_url: string | null
}

export function AddToPlaylistDialog({ track, onClose, onAdded }: Props) {
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [inList, setInList] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = getBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      const { data: pls } = await supabase
        .from('playlists')
        .select('id, name, cover_url')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
      if (cancelled || !pls) return
      setPlaylists(pls)
      if (pls.length > 0) {
        const { data: existing } = await supabase
          .from('playlist_tracks')
          .select('playlist_id')
          .eq('track_id', track.id)
          .in(
            'playlist_id',
            pls.map((p) => p.id)
          )
        if (!cancelled && existing) {
          setInList(new Set(existing.map((r) => r.playlist_id)))
        }
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [track.id])

  async function togglePlaylist(pl: PlaylistRow) {
    if (busyId) return
    setError(null)
    setBusyId(pl.id)
    const wasIn = inList.has(pl.id)
    const next = new Set(inList)
    if (wasIn) next.delete(pl.id)
    else next.add(pl.id)
    setInList(next)
    const result = wasIn
      ? await removeTrackFromPlaylist(pl.id, track.id)
      : await addTrackToPlaylist(pl.id, track.id)
    if (!result.ok) {
      const revert = new Set(inList)
      if (wasIn) revert.add(pl.id)
      else revert.delete(pl.id)
      setInList(revert)
      setError(result.error ?? 'No se pudo actualizar la lista.')
    } else {
      onAdded?.()
    }
    setBusyId(null)
  }

  async function handleCreate() {
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    setError(null)
    const result = await createPlaylist(name)
    if (!result.ok || !result.playlist) {
      setError(result.error ?? 'No se pudo crear la lista.')
      setCreating(false)
      return
    }
    const pl: PlaylistRow = {
      id: result.playlist.id,
      name: result.playlist.name,
      cover_url: result.playlist.cover_url ?? null,
    }
    setPlaylists((prev) => [pl, ...prev])
    setInList((prev) => new Set(prev).add(pl.id))
    setNewName('')
    const add = await addTrackToPlaylist(pl.id, track.id)
    if (!add.ok) setError(add.error ?? 'No se pudo añadir la canción.')
    else onAdded?.()
    setCreating(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Añadir a lista"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80dvh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-surface p-4 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold">Añadir a lista</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 text-muted transition-colors hover:text-foreground"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <p className="mb-4 flex items-center gap-2 truncate text-sm text-muted">
          <Cover
            src={track.cover_url ?? track.album?.cover_url}
            alt=""
            className="size-8 shrink-0"
          />
          <span className="truncate">
            {track.title} · {formatArtists(track)}
          </span>
        </p>

        <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-background p-1.5">
          <ListPlus aria-hidden className="ml-1.5 size-4 shrink-0 text-muted" />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate()
            }}
            placeholder="Nombre de la nueva lista"
            className="h-9 min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/60 outline-none"
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!newName.trim() || creating}
            aria-label="Crear lista y añadir la canción"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {creating ? (
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
            ) : (
              <Plus aria-hidden className="size-3.5" />
            )}
            Crear
          </button>
        </div>

        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 aria-hidden className="size-5 animate-spin text-muted" />
            </div>
          ) : playlists.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              Todavía no tienes listas. Crea una arriba.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {playlists.map((pl) => {
                const added = inList.has(pl.id)
                return (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => void togglePlaylist(pl)}
                    disabled={busyId === pl.id}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-hover/60 disabled:opacity-50"
                  >
                    {pl.cover_url ? (
                      <Cover src={pl.cover_url} alt="" className="size-10 shrink-0" />
                    ) : (
                      <div className="bg-gradient-brand flex size-10 shrink-0 items-center justify-center rounded-lg text-white">
                        <Music2 aria-hidden className="size-4" />
                      </div>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {pl.name}
                    </span>
                    {busyId === pl.id ? (
                      <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-muted" />
                    ) : (
                      <span
                        className={cn(
                          'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                          added ? 'text-accent' : 'text-muted'
                        )}
                      >
                        <Check aria-hidden className="size-4" />
                        {added ? 'En la lista' : 'Añadir'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}