'use client'

import { Play } from 'lucide-react'
import { usePlayer } from '@/contexts/player-provider'
import type { LibraryTrack } from '@/components/library/track-row'
import type { Genre } from '@/types/music'

// Botón para reproducir todas las canciones del género (como una lista).
interface Props {
  genre: Genre
  tracks: LibraryTrack[]
}

export function GenrePlayButton({ genre, tracks }: Props) {
  const player = usePlayer()

  if (tracks.length === 0) return null

  function handlePlay() {
    player.playTracks(tracks, 0, { type: 'genre', id: genre.id, title: genre.name })
  }

  return (
    <button
      type="button"
      onClick={handlePlay}
      className="flex items-center gap-2 rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
    >
      <Play aria-hidden className="size-4 fill-current" />
      Reproducir
    </button>
  )
}