import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { getArtists, getFavoriteTrackIds, getGenres, getNewAlbums, getTopTracks } from '@/lib/library'
import { SectionHeader } from '@/components/library/section-header'
import { AlbumCard, ArtistCard, GenreChip } from '@/components/library/cards'
import { TrackList } from '@/components/library/track-list'
import { EmptyState } from '@/components/ui/spinner'
import { Compass } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Descubrir',
}

export default async function DiscoverPage() {
  const user = await requireUser()

  const [top, albums, artists, genres] = await Promise.all([
    getTopTracks(12),
    getNewAlbums(12),
    getArtists(12),
    getGenres(),
  ])

  const favIds = await getFavoriteTrackIds(user.id, top.map((t) => t.id))

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Descubrir</h1>
        <p className="mt-1 text-sm text-muted">
          Lo más escuchado y lo último que se añadió a la biblioteca.
        </p>
      </div>

      {top.length === 0 && (
        <EmptyState
          icon={<Compass className="size-10" />}
          title="Nada que descubrir todavía"
          description="Cuando haya canciones, aquí verás las más populares y las novedades."
        />
      )}

      {top.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Más escuchadas" />
          <TrackList
            tracks={top}
            favoriteIds={favIds}
            context={{ type: 'discover', title: 'Más escuchadas' }}
          />
        </section>
      )}

      {genres.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Géneros" />
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <GenreChip key={genre.id} genre={genre} />
            ))}
          </div>
        </section>
      )}

      {albums.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Nuevos álbumes" />
          <div className="-mx-2 flex gap-1 overflow-x-auto px-2 pb-1">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      )}

      {artists.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Artistas" />
          <div className="-mx-2 flex gap-1 overflow-x-auto px-2 pb-1">
            {artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}