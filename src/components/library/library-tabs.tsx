'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Disc3,
  Heart,
  Library as LibraryIcon,
  ListMusic,
  Mic2,
  Music2,
  Plus,
  Shapes,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrackListPaginated } from './track-list-paginated'
import { AlbumCard, ArtistCard, GenreCard } from './cards'
import { PlaylistCard } from './playlist-card'
import { TrackList } from './track-list'
import { EmptyState } from '@/components/ui/spinner'
import { PlaylistFormDialog } from '@/components/playlist/playlist-form-dialog'
import type { LibraryTrack } from './track-row'
import type { Album, Artist, Genre, Playlist } from '@/types/music'

const TABS = [
  { id: 'tracks', label: 'Canciones', icon: Music2 },
  { id: 'albums', label: 'Álbumes', icon: Disc3 },
  { id: 'artists', label: 'Artistas', icon: Mic2 },
  { id: 'genres', label: 'Géneros', icon: Shapes },
  { id: 'playlists', label: 'Listas', icon: ListMusic },
  { id: 'favorites', label: 'Favoritas', icon: Heart },
] as const

type TabId = (typeof TABS)[number]['id']

interface Props {
  userId: string
  initialTracks: LibraryTrack[]
  initialCursor: string | null
  favoriteIds: Set<string>
  albums: Album[]
  artists: Artist[]
  genres: Genre[]
  favoriteTracks: LibraryTrack[]
  playlists: Playlist[]
}

export function LibraryTabs({
  initialTracks,
  initialCursor,
  favoriteIds,
  albums,
  artists,
  genres,
  favoriteTracks,
  playlists,
}: Props) {
  const [tab, setTab] = useState<TabId>('tracks')
  const [createOpen, setCreateOpen] = useState(false)
  const router = useRouter()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              tab === id
                ? 'bg-gradient-brand text-white'
                : 'text-muted hover:bg-surface-hover hover:text-foreground'
            )}
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'tracks' && (
        <TrackListPaginated
          initialTracks={initialTracks}
          initialCursor={initialCursor}
          favoriteIds={favoriteIds}
          fetchUrl="/api/search?q=&limit=60"
          context={{ type: 'queue', title: 'Tu biblioteca' }}
          emptyMessage="Aún no hay canciones en la biblioteca."
        />
      )}

      {tab === 'albums' && (
        <>
          {albums.length === 0 ? (
            <EmptyState
              icon={<LibraryIcon className="size-10" />}
              title="Sin álbumes"
              description="Los álbumes aparecerán aquí cuando se suban canciones con etiquetas de álbum."
            />
          ) : (
            <div className="flex flex-wrap gap-1">
              {albums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'artists' && (
        <>
          {artists.length === 0 ? (
            <EmptyState
              icon={<Mic2 className="size-10" />}
              title="Sin artistas"
              description="Los artistas se crean automáticamente al subir canciones."
            />
          ) : (
            <div className="flex flex-wrap gap-1">
              {artists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'genres' && (
        <>
          {genres.length === 0 ? (
            <EmptyState
              icon={<Shapes className="size-10" />}
              title="Sin géneros"
              description="Los géneros aparecerán aquí cuando las canciones tengan uno asignado."
            />
          ) : (
            <div className="flex flex-wrap gap-3">
              {genres.map((genre) => (
                <GenreCard key={genre.id} genre={genre} className="w-40 md:w-44" />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'playlists' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">{playlists.length} listas</p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus aria-hidden className="size-4" />
              Nueva lista
            </button>
          </div>

          {playlists.length === 0 ? (
            <EmptyState
              icon={<ListMusic className="size-10" />}
              title="Sin listas todavía"
              description="Crea tu primera lista con tus canciones favoritas."
            />
          ) : (
            <div className="flex flex-wrap gap-1">
              {playlists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'favorites' && (
        <>
          {favoriteTracks.length === 0 ? (
            <EmptyState
              icon={<Heart className="size-10" />}
              title="Sin favoritas todavía"
              description="Toca el corazón en cualquier canción para guardarla aquí."
            />
          ) : (
            <div className="flex flex-col gap-1">
              <TrackList
                tracks={favoriteTracks}
                favoriteIds={new Set(favoriteTracks.map((t) => t.id))}
                context={{ type: 'favorites', title: 'Tus favoritas' }}
              />
              <p className="mt-2 text-xs text-muted">
                <Link href="/search" className="text-accent hover:underline">
                  Buscar canciones
                </Link>{' '}
                para añadir más favoritas.
              </p>
            </div>
          )}
        </>
      )}

      {createOpen && (
        <PlaylistFormDialog
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false)
            router.refresh()
          }}
          mode="create"
        />
      )}
    </div>
  )
}