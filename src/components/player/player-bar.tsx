'use client'

import { useState } from 'react'
import { ChevronUp, Loader2, Pause, Play } from 'lucide-react'
import { usePlayer } from '@/contexts/player-provider'
import { Cover } from '@/components/library/cover'
import { cn, formatDuration } from '@/lib/utils'
import { ExpandedPlayer } from './expanded-player'

// Barra del reproductor (compacta). Vive sobre la bottom nav en móvil y
// fija abajo en desktop. Tocar la zona izquierda abre el reproductor
// expandido (pantalla completa en móvil).
export function PlayerBar() {
  const { current, isPlaying, isLoading, positionMs, durationMs, togglePlay } = usePlayer()
  const [expanded, setExpanded] = useState(false)

  const hasTrack = Boolean(current)

  return (
    <>
      <div className="mb-14 shrink-0 md:mb-0">
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/80 backdrop-blur md:bottom-0">
          {hasTrack && (
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-0.5 bg-border"
            >
              <div
                className="h-full bg-gradient-brand transition-[width] duration-300"
                style={{
                  width: durationMs > 0 ? `${Math.min(100, (positionMs / durationMs) * 100)}%` : '0%',
                }}
              />
            </div>
          )}

          <div className="mx-auto flex h-[var(--player-height)] max-w-7xl items-center gap-2 px-3 md:px-4">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              disabled={!hasTrack}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left disabled:opacity-100"
              aria-label="Abrir reproductor"
            >
              <Cover
                src={current?.cover_url ?? current?.album?.cover_url}
                alt={`Portada de ${current?.title ?? 'nada'}`}
                className={cn(
                  'size-11',
                  isPlaying && !isLoading && 'animate-spin-slow [animation-play-state:running]'
                )}
                rounded="full"
              />
              <div className="min-w-0">
                <p className={cn('truncate text-sm font-medium', !hasTrack && 'text-muted')}>
                  {current?.title ?? 'Nada sonando'}
                </p>
                <p className="truncate text-xs text-muted">
                  {current?.artist?.name ?? (hasTrack ? 'Artista desconocido' : 'Toca play en una canción')}
                </p>
              </div>
            </button>

            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                onClick={togglePlay}
                disabled={!hasTrack}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                className="bg-gradient-brand flex size-10 items-center justify-center rounded-full text-white transition-transform active:scale-95 disabled:opacity-40"
              >
                {isLoading ? (
                  <Loader2 aria-hidden className="size-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause aria-hidden className="size-5 fill-current" />
                ) : (
                  <Play aria-hidden className="ml-0.5 size-5 fill-current" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={togglePlay}
                disabled={!hasTrack}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                className="flex size-11 items-center justify-center rounded-full text-foreground transition-transform active:scale-95 disabled:opacity-40 md:hidden"
              >
                {isLoading ? (
                  <Loader2 aria-hidden className="size-6 animate-spin text-accent" />
                ) : isPlaying ? (
                  <Pause aria-hidden className="size-7 fill-current" />
                ) : (
                  <Play aria-hidden className="ml-0.5 size-7 fill-current" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setExpanded(true)}
                disabled={!hasTrack}
                aria-label="Abrir reproductor"
                className="flex size-9 items-center justify-center rounded-full text-muted hover:text-foreground disabled:opacity-40 md:hidden"
              >
                <ChevronUp aria-hidden className="size-6" />
              </button>
            </div>

            <span className="hidden text-xs tabular-nums text-muted md:block">
              {formatDuration(positionMs)} / {formatDuration(durationMs)}
            </span>
          </div>
        </div>
      </div>

      {hasTrack && <ExpandedPlayer open={expanded} onClose={() => setExpanded(false)} />}
    </>
  )
}