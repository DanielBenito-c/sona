'use client'

import { usePlayer } from '@/contexts/player-provider'
import { Cover } from '@/components/library/cover'
import {
  ChevronDown,
  GripVertical,
  Loader2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import type { RepeatMode } from '@/types/player'

// Reproductor expandido: pantalla completa en móvil, panel lateral en
// desktop. Incluye la cola con reordenar/eliminar.
export function ExpandedPlayer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    current,
    queue,
    queueIndex,
    isPlaying,
    isLoading,
    positionMs,
    durationMs,
    volume,
    muted,
    shuffle,
    repeat,
    togglePlay,
    next,
    previous,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    removeFromQueue,
    reorderQueue,
    clearQueue,
  } = usePlayer()

  if (!open || !current) return null

  const progressPct = durationMs > 0 ? (positionMs / durationMs) * 100 : 0
  const repeatLabel: Record<RepeatMode, string> = {
    off: 'Repetición desactivada',
    all: 'Repetición de la cola',
    one: 'Repetir canción',
  }

  return (
    <div className="bg-background/95 fixed inset-0 z-50 flex flex-col backdrop-blur-xl md:inset-y-4 md:right-4 md:top-1/2 md:bottom-auto md:left-auto md:h-[calc(100dvh-8rem)] md:w-[26rem] md:-translate-y-1/2 md:rounded-3xl md:border md:border-border md:shadow-2xl">
      <div className="pt-safe flex items-center justify-between px-4 pt-3 pb-1">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar reproductor"
          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-foreground"
        >
          <ChevronDown aria-hidden className="size-6 md:hidden" />
          <X aria-hidden className="hidden size-5 md:block" />
        </button>
        <p className="text-xs font-medium tracking-widest text-muted uppercase">
          En reproducción
        </p>
        <div className="size-9" aria-hidden />
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 pt-2 pb-4">
        <div className="flex flex-col items-center gap-4">
          <Cover
            src={current.cover_url ?? current.album?.cover_url}
            alt={`Portada de ${current.title}`}
            rounded="rounded-3xl"
            className={cn('size-60 md:size-64', isPlaying && !isLoading && 'animate-spin-slow')}
          />

          <div className="w-full text-center">
            <h2 className="truncate text-lg font-bold">{current.title}</h2>
            <p className="truncate text-sm text-muted">
              {current.artist?.name ?? 'Artista desconocido'}
              {current.album?.title ? ` · ${current.album.title}` : ''}
            </p>
          </div>

          <div className="w-full">
            <input
              type="range"
              min={0}
              max={Math.max(1, durationMs)}
              value={Math.min(positionMs, durationMs)}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label="Progreso"
              className="w-full"
              style={{
                background: `linear-gradient(to right, var(--accent) ${progressPct}%, var(--border) ${progressPct}%)`,
              }}
            />
            <div className="mt-1 flex justify-between text-xs tabular-nums text-muted">
              <span>{formatDuration(positionMs)}</span>
              <span>{formatDuration(durationMs)}</span>
            </div>
          </div>

          <div className="flex w-full items-center justify-between px-2">
            <button
              type="button"
              onClick={toggleShuffle}
              aria-label={shuffle ? 'Desactivar mezcla' : 'Activar mezcla'}
              aria-pressed={shuffle}
              className={cn(
                'flex size-10 items-center justify-center rounded-full transition-colors',
                shuffle ? 'text-accent' : 'text-muted hover:text-foreground'
              )}
            >
              <Shuffle aria-hidden className="size-5" />
            </button>

            <button
              type="button"
              onClick={previous}
              aria-label="Anterior"
              className="flex size-12 items-center justify-center rounded-full text-foreground transition-transform active:scale-95"
            >
              <SkipBack aria-hidden className="size-7 fill-current" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              className="bg-gradient-brand flex size-16 items-center justify-center rounded-full text-white shadow-lg shadow-accent/30 transition-transform active:scale-95"
            >
              {isLoading ? (
                <Loader2 aria-hidden className="size-7 animate-spin" />
              ) : isPlaying ? (
                <Pause aria-hidden className="size-8 fill-current" />
              ) : (
                <Play aria-hidden className="ml-1 size-8 fill-current" />
              )}
            </button>

            <button
              type="button"
              onClick={next}
              aria-label="Siguiente"
              className="flex size-12 items-center justify-center rounded-full text-foreground transition-transform active:scale-95"
            >
              <SkipForward aria-hidden className="size-7 fill-current" />
            </button>

            <button
              type="button"
              onClick={cycleRepeat}
              aria-label={repeatLabel[repeat]}
              aria-pressed={repeat !== 'off'}
              className={cn(
                'flex size-10 items-center justify-center rounded-full transition-colors',
                repeat !== 'off' ? 'text-accent' : 'text-muted hover:text-foreground'
              )}
            >
              {repeat === 'one' ? (
                <Repeat1 aria-hidden className="size-5" />
              ) : (
                <Repeat aria-hidden className="size-5" />
              )}
            </button>
          </div>

          <div className="hidden w-full items-center justify-center gap-3 md:flex">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Quitar silencio' : 'Silenciar'}
              className="text-muted hover:text-foreground"
            >
              {muted || volume === 0 ? (
                <VolumeX aria-hidden className="size-5" />
              ) : (
                <Volume2 aria-hidden className="size-5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volumen"
              className="w-32"
            />
          </div>
        </div>

        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Cola <span className="text-muted">({queue.length})</span>
            </h3>
            {queue.length > 0 && (
              <button
                type="button"
                onClick={clearQueue}
                className="text-xs text-muted transition-colors hover:text-foreground"
              >
                Vaciar
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-col gap-0.5 overflow-y-auto">
            {queue.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">
                La cola está vacía. Toca play en cualquier canción.
              </p>
            )}
            {queue.map((track, i) => {
              const isCurrent = i === queueIndex
              return (
                <div
                  key={`${track.id}-${i}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2 py-1.5',
                    isCurrent && 'bg-surface-hover'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => reorderQueue(i, Math.max(0, i - 1))}
                    disabled={i === 0}
                    aria-label={`Mover arriba ${track.title}`}
                    className="shrink-0 text-muted disabled:opacity-30"
                  >
                    <GripVertical aria-hidden className="size-4" />
                  </button>
                  <Cover
                    src={track.cover_url ?? track.album?.cover_url}
                    alt=""
                    className="size-9"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-sm',
                        isCurrent ? 'font-semibold text-accent' : 'font-medium'
                      )}
                    >
                      {track.title}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {track.artist?.name ?? 'Artista desconocido'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromQueue(i)}
                    aria-label={`Quitar ${track.title} de la cola`}
                    className="shrink-0 p-1 text-muted transition-colors hover:text-foreground"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}