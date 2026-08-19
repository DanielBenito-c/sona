import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Music2 } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getFavoriteTrackIds, getGenreDetail } from '@/lib/library'
import { AlbumCard } from '@/components/library/cards'
import { TrackList } from '@/components/library/track-list'
import { SectionHeader } from '@/components/library/section-header'
import { GenrePlayButton } from '@/components/genre/genre-play-button'
import { BackButton } from '@/components/ui/back-button'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const detail = await getGenreDetail(id)
  return { title: detail ? `${detail.genre.name} · Sona` : 'Género no encontrado' }
}

export default async function GenrePage({ params }: Props) {
  const user = await requireUser()
  const { id } = await params
  const detail = await getGenreDetail(id)
  if (!detail) notFound()

  const { genre, tracks, albums } = detail
  const favIds = await getFavoriteTrackIds(
    user.id,
    tracks.map((t) => t.id)
  )

  return (
    <div className="flex flex-col gap-6">
      <BackButton href="/library" />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
        <div className="bg-gradient-to-br from-violet-500 to-purple-700 flex size-40 items-center justify-center rounded-2xl text-white shadow-lg shadow-black/20 md:size-56">
          <Music2 aria-hidden className="size-20 opacity-90" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-widest text-muted uppercase">Género</p>
          <h1 className="mt-1 text-3xl font-bold md:text-4xl">{genre.name}</h1>
          <p className="mt-2 text-sm text-muted">
            {genre.track_count ?? tracks.length}{' '}
            {(genre.track_count ?? tracks.length) === 1 ? 'canción' : 'canciones'}
            {albums.length > 0 ? ` · ${albums.length} ${albums.length === 1 ? 'álbum' : 'álbumes'}` : ''}
          </p>
          <div className="mt-4">
            <GenrePlayButton genre={genre} tracks={tracks} />
          </div>
        </div>
      </div>

      {albums.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Álbumes" />
          <div className="-mx-2 flex gap-1 overflow-x-auto px-2 pb-1">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      )}

      {tracks.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface/50 px-4 py-8 text-center text-sm text-muted">
          Este género todavía no tiene canciones.
        </p>
      ) : (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Canciones" />
          <TrackList
            tracks={tracks}
            favoriteIds={favIds}
            context={{ type: 'genre', id: genre.id, title: genre.name }}
          />
        </section>
      )}
    </div>
  )
}