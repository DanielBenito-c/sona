'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, Loader2, Pause, Play } from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase/client'
import { usePlayer } from '@/contexts/player-provider'
import { cn, formatDuration } from '@/lib/utils'
import { Cover } from './cover'
import type { Album, Artist, Track } from '@/types/music'
import type { QueueContext } from '@/types/player'

export type LibraryTrack = Track & { artist: Artist | null; album: Album | null; _fav?: boolean }

interface Props {
  track: LibraryTrack
  isFavorite: boolean
  onToggleFavorite?: (trackId: string, nowFavorite: boolean) => void
  /** Reproduce la canción dentro de la lista visible (cola = lista completa). */
  onPlay?: (track: LibraryTrack, tracks: LibraryTrack[], context?: QueueContext) => void
  /** Lista visible a la que pertenece la fila (para la cola de reproducción). */
  list?: LibraryTrack[]
  context?: QueueContext
  showAlbum?: boolean
}

export function TrackRow({
  track,
  isFavorite,
  onToggleFavorite,
  onPlay,
  list,
  context,
  showAlbum = true,
}: Props) {
  const [fav, setFav] = useState(isFavorite)
  const [busy, setBusy] = useState(false)
  const player = usePlayer()
  const isCurrent = player.current?.id === track.id
  const isCurrentPlaying = isCurrent && player.isPlaying

  async function toggleFavorite() {
    if (busy) return
    setBusy(true)
    const supabase = getBrowserClient()
    const next = !fav
    // Optimista; si falla, se revierte.
    setFav(next)
    const { error } = next
      ? await supabase.from('favorites').insert({ item_type: 'track', item_id: track.id })
      : await supabase.from('favorites').delete().eq('item_type', 'track').eq('item_id', track.id)
    if (error) setFav(!next)
    setBusy(false)
    onToggleFavorite?.(track.id, next)
  }

  function handlePlay() {
    if (onPlay) {
      onPlay(track, list ?? [track], context)
    } else if (isCurrent) {
      player.togglePlay()
    } else {
      player.playTrack(track, context)
    }
  }

  return (
    <div className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-hover/60">
      <button
        type="button"
        onClick={handlePlay}
        aria-label={isCurrentPlaying ? `Pausar ${track.title}` : `Reproducir ${track.title}`}
        className="relative shrink-0"
      >
        <Cover
          src={track.cover_url ?? track.album?.cover_url}
          alt={`Portada de ${track.title}`}
          className="size-11"
        />
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-lg bg-black/45 transition-opacity',
            isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          {player.isLoading && isCurrent ? (
            <Loader2 aria-hidden className="size-5 animate-spin text-white" />
          ) : isCurrentPlaying ? (
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
          {showAlbum && track.album?.title && (
            <>
              {' · '}
              <Link
                href={`/album/${track.album_id}`}
                className="hover:text-foreground hover:underline"
              >
                {track.album.title}
              </Link>
            </>
          )}
        </p>
      </div>
      <span className="hidden text-xs tabular-nums text-muted sm:block">
        {formatDuration(track.duration_ms)}
      </span>
      <button
        type="button"
        onClick={toggleFavorite}
        disabled={busy}
        aria-label={fav ? 'Quitar de favoritas' : 'Añadir a favoritas'}
        aria-pressed={fav}
        className="rounded-full p-2 text-muted transition-colors hover:text-foreground disabled:opacity-40"
      >
        <Heart
          aria-hidden
          className={cn('size-4 transition-colors', fav && 'fill-accent text-accent')}
        />
      </button>
    </div>
  )
}