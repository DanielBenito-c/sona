'use client'

import { ListMusic, Pause, Play, Trash2 } from 'lucide-react'
import { usePlayer } from '@/contexts/player-provider'
import { Cover } from '@/components/library/cover'
import { cn } from '@/lib/utils'

export default function QueuePage() {
  const {
    queue,
    queueIndex,
    isPlaying,
    togglePlay,
    removeFromQueue,
    clearQueue,
    playTracks,
  } = usePlayer()

  if (queue.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold md:text-3xl">Cola de reproducción</h1>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface/50 px-4 py-12 text-center">
          <ListMusic className="size-10 text-muted" aria-hidden />
          <p className="font-medium">La cola está vacía</p>
          <p className="text-sm text-muted">
            Toca play en cualquier canción de la biblioteca y aparecerá aquí.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Cola de reproducción</h1>
          <p className="mt-1 text-sm text-muted">
            {queue.length} canciones en cola
          </p>
        </div>
        <button
          type="button"
          onClick={clearQueue}
          className="rounded-xl border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-accent/60 hover:text-foreground"
        >
          Vaciar
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {queue.map((track, i) => {
          const isCurrent = i === queueIndex
          return (
            <div
              key={`${track.id}-${i}`}
              className={cn(
                'flex items-center gap-3 rounded-xl px-2 py-2 transition-colors',
                isCurrent && 'bg-surface-hover/70'
              )}
            >
              <button
                type="button"
                onClick={() => (isCurrent ? togglePlay() : playTracks(queue, i, undefined))}
                aria-label={isCurrent && isPlaying ? `Pausar ${track.title}` : `Reproducir ${track.title}`}
                className="relative shrink-0"
              >
                <Cover
                  src={track.cover_url ?? track.album?.cover_url}
                  alt={`Portada de ${track.title}`}
                  className="size-11"
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/45">
                  {isCurrent && isPlaying ? (
                    <Pause aria-hidden className="size-5 fill-current text-white" />
                  ) : (
                    <Play aria-hidden className="ml-0.5 size-5 fill-current text-white" />
                  )}
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm font-medium', isCurrent && 'text-accent')}>
                  {track.title}
                </p>
                <p className="truncate text-xs text-muted">
                  {track.artist?.name ?? 'Artista desconocido'}
                  {track.album?.title ? ` · ${track.album.title}` : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeFromQueue(i)}
                aria-label={`Quitar ${track.title} de la cola`}
                className="rounded-full p-2 text-muted transition-colors hover:text-foreground"
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}