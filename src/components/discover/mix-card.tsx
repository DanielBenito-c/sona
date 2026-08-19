'use client'

import Link from 'next/link'
import { usePlayer } from '@/contexts/player-provider'
import { genreGradient } from '@/components/library/cards'
import { Play } from 'lucide-react'
import type { Track } from '@/types/music'

// Tarjeta de mix por género estilo Daily Mix de Spotify: degradado,
// reproducción directa y enlace a la página del género.
export function MixCard({
  genreId,
  genreName,
  title,
  tracks,
}: {
  genreId: string
  genreName: string
  title: string
  tracks: Track[]
}) {
  const player = usePlayer()

  function handlePlay(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    player.playTracks(tracks, 0, { type: 'genre', id: genreId, title })
  }

  return (
    <Link
      href={`/genre/${genreId}`}
      className={`group relative flex h-28 shrink-0 flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-br p-3 text-white shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 ${genreGradient(genreId)}`}
    >
      <span className="text-base font-bold drop-shadow-sm">{title}</span>
      <span className="text-xs font-medium text-white/80">
        {genreName} · {tracks.length} canciones
      </span>
      <button
        type="button"
        onClick={handlePlay}
        aria-label={`Reproducir ${title}`}
        className="absolute right-3 top-3 flex size-11 translate-y-2 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100"
      >
        <Play className="ml-0.5 size-4 fill-current" aria-hidden />
      </button>
    </Link>
  )
}