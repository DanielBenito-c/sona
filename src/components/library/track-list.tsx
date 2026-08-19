'use client'

import { usePlayer } from '@/contexts/player-provider'
import { TrackRow, type LibraryTrack } from './track-row'
import type { Track } from '@/types/music'
import type { QueueContext } from '@/types/player'

// Lista estática de canciones con play conectado a la cola del reproductor.
// La cola de reproducción es la lista visible completa.
interface Props {
  tracks: LibraryTrack[]
  favoriteIds?: Set<string>
  context?: QueueContext
  showAlbum?: boolean
  emptyMessage?: string
}

export function TrackList({ tracks, favoriteIds, context, showAlbum, emptyMessage }: Props) {
  const player = usePlayer()

  if (tracks.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface/50 px-4 py-8 text-center text-sm text-muted">
        {emptyMessage ?? 'Sin resultados'}
      </p>
    )
  }

  function handlePlay(track: LibraryTrack) {
    const index = tracks.findIndex((t) => t.id === track.id)
    player.playTracks(tracks as Track[], index >= 0 ? index : 0, context)
  }

  return (
    <div className="flex flex-col gap-1">
      {tracks.map((track) => (
        <TrackRow
          key={track.id}
          track={track}
          isFavorite={favoriteIds?.has(track.id) ?? false}
          onPlay={handlePlay}
          context={context}
          showAlbum={showAlbum}
        />
      ))}
    </div>
  )
}