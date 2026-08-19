'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase/client'
import { usePlayer } from '@/contexts/player-provider'
import { TrackRow, type LibraryTrack } from './track-row'
import type { Track } from '@/types/music'
import type { QueueContext } from '@/types/player'

interface Props {
  initialTracks: LibraryTrack[]
  initialCursor: string | null
  favoriteIds: Set<string>
  fetchUrl: string // p. ej. /api/search?q=…&limit=30
  context?: QueueContext
  emptyMessage?: string
}

export function TrackListPaginated({
  initialTracks,
  initialCursor,
  favoriteIds,
  fetchUrl,
  context,
  emptyMessage,
}: Props) {
  const [tracks, setTracks] = useState(initialTracks)
  const [cursor, setCursor] = useState(initialCursor)
  const [favIds, setFavIds] = useState(favoriteIds)
  const [loading, setLoading] = useState(false)
  const player = usePlayer()

  // Marca los favoritos reales del usuario para una página recién cargada.
  async function fetchFavoritesFor(trackIds: string[]) {
    if (trackIds.length === 0) return
    const supabase = getBrowserClient()
    const { data } = await supabase
      .from('favorites')
      .select('item_id')
      .eq('item_type', 'track')
      .in('item_id', trackIds)
    setFavIds((prev) => {
      const next = new Set(prev)
      for (const row of data ?? []) next.add(row.item_id)
      return next
    })
  }

  async function loadMore() {
    if (!cursor || loading) return
    setLoading(true)
    try {
      const res = await fetch(`${fetchUrl}&cursor=${encodeURIComponent(cursor)}`)
      if (!res.ok) return
      const data = await res.json()
      const next = (data.tracks ?? []) as LibraryTrack[]
      if (next.length === 0) {
        setCursor(null)
        return
      }
      setTracks((prev) => [...prev, ...next])
      setCursor(data.nextCursor ?? null)
      void fetchFavoritesFor(next.map((t) => t.id))
    } finally {
      setLoading(false)
    }
  }

  function toggleFavorite(trackId: string, nowFavorite: boolean) {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, _fav: nowFavorite } : t))
    )
  }

  function handlePlay(track: LibraryTrack) {
    const index = tracks.findIndex((t) => t.id === track.id)
    player.playTracks(tracks as Track[], index >= 0 ? index : 0, context)
  }

  if (tracks.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface/50 px-4 py-8 text-center text-sm text-muted">
        {emptyMessage ?? 'Sin resultados'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {tracks.map((track) => (
        <TrackRow
          key={track.id}
          track={track}
          isFavorite={track._fav ?? favIds.has(track.id)}
          onToggleFavorite={toggleFavorite}
          onPlay={handlePlay}
          context={context}
        />
      ))}
      {cursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="mx-auto mt-2 flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-accent/60 hover:text-foreground disabled:opacity-50"
        >
          <ChevronDown aria-hidden className="size-4" />
          {loading ? 'Cargando…' : 'Cargar más'}
        </button>
      )}
    </div>
  )
}