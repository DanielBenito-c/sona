'use client'

import { usePlayer } from '@/contexts/player-provider'
import { Cover } from '@/components/library/cover'
import { Play } from 'lucide-react'
import type { Track } from '@/types/music'

// Banner tipo Spotify: degradado, portada destacada y botón de play que
// reproduce las canciones más escuchadas de la biblioteca.
export function DiscoverHero({ tracks }: { tracks: Track[] }) {
  const player = usePlayer()
  const first = tracks[0]

  function handlePlay() {
    player.playTracks(tracks, 0, { type: 'discover', title: 'Lo mejor de la biblioteca' })
  }

  return (
    <div className="relative flex h-44 items-end overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-900 p-5 text-white shadow-lg shadow-black/30 md:h-52 md:p-7">
      {first?.cover_url && (
        <Cover
          src={first.cover_url}
          alt=""
          aria-hidden
          className="absolute -right-4 -top-4 size-32 rotate-12 rounded-xl opacity-90 shadow-2xl md:size-44"
        />
      )}
      <div className="relative z-10 flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
            La biblioteca de Sona
          </p>
          <h2 className="mt-1 text-3xl font-extrabold drop-shadow-sm md:text-5xl">
            Lo mejor de la biblioteca
          </h2>
          <p className="mt-1 text-sm text-white/80">
            {tracks.length} canciones más escuchadas
          </p>
        </div>
        <button
          type="button"
          onClick={handlePlay}
          aria-label="Reproducir lo más escuchado"
          className="flex size-12 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <Play className="ml-0.5 size-5 fill-current" aria-hidden />
        </button>
      </div>
    </div>
  )
}