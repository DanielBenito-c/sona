'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ListMusic, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { usePlayer } from '@/contexts/player-provider'
import { deletePlaylist, removeTrackFromPlaylist } from '@/lib/playlists'
import { TrackList } from '@/components/library/track-list'
import { PlaylistFormDialog } from './playlist-form-dialog'
import { AddTracksDialog } from './add-tracks-dialog'
import type { LibraryTrack } from '@/components/library/track-row'
import type { Playlist } from '@/types/music'

// Parte interactiva de la página de playlist: reproducir, editar, borrar,
// añadir canciones y quitarlas.
interface Props {
  playlist: Playlist
  tracks: LibraryTrack[]
  favoriteIds: Set<string>
  isOwner: boolean
}

export function PlaylistClient({ playlist, tracks, favoriteIds, isOwner }: Props) {
  const router = useRouter()
  const player = usePlayer()
  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function handlePlay() {
    if (tracks.length === 0) return
    player.playTracks(tracks, 0, {
      type: 'playlist',
      id: playlist.id,
      title: playlist.name,
    })
  }

  async function handleDelete() {
    if (deleting) return
    const ok = window.confirm(`¿Borrar la lista «${playlist.name}»? No se podrá recuperar.`)
    if (!ok) return
    setDeleting(true)
    const result = await deletePlaylist(playlist.id)
    setDeleting(false)
    if (result.ok) {
      router.replace('/library')
    } else {
      window.alert(result.error ?? 'No se pudo borrar la lista.')
    }
  }

  async function handleRemove(trackId: string) {
    const result = await removeTrackFromPlaylist(playlist.id, trackId)
    if (!result.ok) {
      window.alert(result.error ?? 'No se pudo quitar la canción.')
      return
    }
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handlePlay}
          disabled={tracks.length === 0}
          className="flex items-center gap-2 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Play aria-hidden className="size-4 fill-current" />
          Reproducir
        </button>

        {isOwner && (
          <>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/60"
            >
              <Plus aria-hidden className="size-4" />
              Añadir canciones
            </button>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              aria-label="Editar lista"
              className="rounded-full border border-border p-2.5 text-muted transition-colors hover:border-accent/60 hover:text-foreground"
            >
              <Pencil aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Borrar lista"
              className="rounded-full border border-border p-2.5 text-muted transition-colors hover:border-red-500/60 hover:text-red-400 disabled:opacity-40"
            >
              <Trash2 aria-hidden className="size-4" />
            </button>
          </>
        )}
      </div>

      {tracks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface/50 px-4 py-10 text-center">
          <ListMusic aria-hidden className="size-10 text-muted" />
          <p className="text-sm text-muted">
            {isOwner
              ? 'Esta lista aún no tiene canciones. Usa «Añadir canciones» para llenarla.'
              : 'Esta lista aún no tiene canciones.'}
          </p>
        </div>
      ) : (
        <TrackList
          tracks={tracks}
          favoriteIds={favoriteIds}
          context={{ type: 'playlist', id: playlist.id, title: playlist.name }}
          onRemove={isOwner ? handleRemove : undefined}
        />
      )}

      {editOpen && (
        <PlaylistFormDialog
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false)
            router.refresh()
          }}
          mode="edit"
          playlistId={playlist.id}
          initialName={playlist.name}
          initialDescription={playlist.description ?? ''}
        />
      )}

      {addOpen && (
        <AddTracksDialog
          onClose={() => setAddOpen(false)}
          playlistId={playlist.id}
          existingTrackIds={new Set(tracks.map((t) => t.id))}
          onAdded={() => router.refresh()}
        />
      )}
    </>
  )
}