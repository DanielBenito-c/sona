'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, Search as SearchIcon, X } from 'lucide-react'
import { SectionHeader } from '@/components/library/section-header'
import { AlbumCard, ArtistCard, GenreChip } from '@/components/library/cards'
import { TrackRow, type LibraryTrack } from '@/components/library/track-row'
import { usePlayer } from '@/contexts/player-provider'
import type { Album, Artist, Genre, Playlist, Track } from '@/types/music'

interface SearchState {
  tracks: LibraryTrack[]
  artists: Artist[]
  albums: Album[]
  genres: Genre[]
  playlists: Playlist[]
  nextCursor: string | null
}

const EMPTY: SearchState = {
  tracks: [],
  artists: [],
  albums: [],
  genres: [],
  playlists: [],
  nextCursor: null,
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchState>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const player = usePlayer()

  // Debounce de 300 ms con cancelación de peticiones en vuelo.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const timer = setTimeout(async () => {
      setTouched(true)
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=30`, {
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = await res.json()
        if (!controller.signal.aborted) setResults(data)
      } catch {
        // Abortada o error de red: se ignora.
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  async function loadMoreTracks() {
    if (!results.nextCursor) return
    const res = await fetch(
      `/api/search?q=${encodeURIComponent(query.trim())}&limit=30&cursor=${encodeURIComponent(results.nextCursor)}`
    )
    if (!res.ok) return
    const data = await res.json()
    setResults((prev) => ({
      ...prev,
      tracks: [...prev.tracks, ...(data.tracks ?? [])],
      nextCursor: data.nextCursor ?? null,
    }))
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    if (value.trim().length < 2) {
      setResults(EMPTY)
      setTouched(false)
      setLoading(false)
    }
  }

  const hasResults =
    results.tracks.length > 0 ||
    results.artists.length > 0 ||
    results.albums.length > 0 ||
    results.genres.length > 0 ||
    results.playlists.length > 0

  function handlePlay(track: LibraryTrack) {
    const index = results.tracks.findIndex((t) => t.id === track.id)
    player.playTracks(results.tracks as Track[], index >= 0 ? index : 0, {
      type: 'search',
      title: query.trim(),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold md:text-3xl">Buscar</h1>

      <div className="relative">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Canciones, artistas, álbumes, géneros…"
          autoFocus
          className="h-12 w-full rounded-2xl border border-border bg-surface pl-12 pr-11 text-foreground placeholder:text-muted/60 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        {loading && (
          <Loader2
            aria-hidden
            className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin text-accent"
          />
        )}
        {!loading && query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Borrar búsqueda"
            className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full p-1 text-muted hover:text-foreground"
          >
            <X aria-hidden className="size-5" />
          </button>
        )}
      </div>

      {!touched && (
        <p className="text-center text-sm text-muted">
          Escribe al menos 2 caracteres para buscar en la biblioteca.
        </p>
      )}

      {touched && !loading && !hasResults && (
        <p className="text-center text-sm text-muted">
          Sin resultados para «{query.trim()}»
        </p>
      )}

      {results.tracks.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Canciones" />
          <div className="flex flex-col gap-1">
            {results.tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                isFavorite={false}
                onPlay={handlePlay}
                context={{ type: 'search', title: query.trim() }}
              />
            ))}
            {results.nextCursor && (
              <button
                type="button"
                onClick={loadMoreTracks}
                className="mx-auto mt-2 rounded-xl border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-accent/60 hover:text-foreground"
              >
                Cargar más
              </button>
            )}
          </div>
        </section>
      )}

      {results.artists.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Artistas" />
          <div className="-mx-2 flex gap-1 overflow-x-auto px-2 pb-1">
            {results.artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        </section>
      )}

      {results.albums.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Álbumes" />
          <div className="-mx-2 flex gap-1 overflow-x-auto px-2 pb-1">
            {results.albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      )}

      {results.genres.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Géneros" />
          <div className="flex flex-wrap gap-2">
            {results.genres.map((genre) => (
              <GenreChip key={genre.id} genre={genre} />
            ))}
          </div>
        </section>
      )}

      {results.playlists.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Playlists" />
          <div className="flex flex-col gap-2">
            {results.playlists.map((playlist) => (
              <Link
                key={playlist.id}
                href="#"
                className="rounded-xl border border-border bg-surface/50 px-4 py-3 transition-colors hover:border-accent/60"
              >
                <p className="truncate text-sm font-medium">{playlist.name}</p>
                <p className="truncate text-xs text-muted">
                  Playlist de {playlist.owner?.username ?? 'alguien'}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}