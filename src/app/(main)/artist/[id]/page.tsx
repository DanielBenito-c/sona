import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getArtistDetail, getFavoriteTrackIds } from '@/lib/library'
import { Cover } from '@/components/library/cover'
import { AlbumCard } from '@/components/library/cards'
import { SectionHeader } from '@/components/library/section-header'
import { TrackList } from '@/components/library/track-list'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const detail = await getArtistDetail(id)
  return { title: detail ? `${detail.artist.name} · Sona` : 'Artista no encontrado' }
}

export default async function ArtistPage({ params }: Props) {
  const user = await requireUser()
  const { id } = await params
  const detail = await getArtistDetail(id)
  if (!detail) notFound()

  const { artist, albums, tracks } = detail
  const favIds = await getFavoriteTrackIds(
    user.id,
    tracks.map((t) => t.id)
  )

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
        <Cover
          src={artist.image_url}
          alt={`Foto de ${artist.name}`}
          className="size-40 rounded-full md:size-52"
        />
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-widest text-muted uppercase">
            Artista
          </p>
          <h1 className="mt-1 text-3xl font-bold md:text-4xl">{artist.name}</h1>
          <p className="mt-2 text-xs text-muted">
            {albums.length} álbumes · {tracks.length} canciones
          </p>
          {artist.bio && (
            <p className="mt-3 max-w-xl text-sm text-muted">{artist.bio}</p>
          )}
        </div>
      </div>

      {tracks.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Canciones" />
          <TrackList
            tracks={tracks}
            favoriteIds={favIds}
            context={{ type: 'artist', id: artist.id, title: artist.name }}
          />
        </section>
      )}

      {albums.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Álbumes" />
          <div className="flex flex-wrap gap-1">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}