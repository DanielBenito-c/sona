import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import {
  getArtists,
  getFavoriteTrackIds,
  getGenres,
  getNewAlbums,
  getTopTracks,
} from '@/lib/library'
import { getDiscoverData } from '@/lib/discover'
import { SectionHeader } from '@/components/library/section-header'
import { AlbumCard, ArtistCard, GenreCard } from '@/components/library/cards'
import { TrackList } from '@/components/library/track-list'
import { DiscoverHero } from '@/components/discover/discover-hero'
import { MixCard } from '@/components/discover/mix-card'
import { EmptyState } from '@/components/ui/spinner'
import { Compass } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Descubrir',
}

export default async function DiscoverPage() {
  const user = await requireUser()

  const [top, albums, artists, genres, discover] = await Promise.all([
    getTopTracks(12),
    getNewAlbums(12),
    getArtists(12),
    getGenres(),
    getDiscoverData(user.id),
  ])

  const favIds = await getFavoriteTrackIds(user.id, [
    ...top.map((t) => t.id),
    ...discover.recommended.map((t) => t.id),
  ])

  const personalized = discover.playedCount > 0

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Descubrir</h1>
        <p className="mt-1 text-sm text-muted">
          Recomendaciones para ti, novedades y lo más escuchado de la biblioteca.
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
        <DiscoverHero tracks={top.slice(0, 10)} />
      )}

      {personalized && discover.recommended.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Recomendado para ti" />
          <TrackList
            tracks={discover.recommended}
            favoriteIds={favIds}
            context={{ type: 'discover', title: 'Recomendado para ti' }}
          />
        </section>
      )}

      {personalized && discover.mixes.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Tus mixes" />
          <div className="flex gap-3 overflow-x-auto pb-1">
            {discover.mixes.map((mix) => (
              <MixCard
                key={mix.genreId}
                genreId={mix.genreId}
                genreName={mix.genreName}
                title={mix.title}
                tracks={mix.tracks}
              />
            ))}
          </div>
        </section>
      )}

      {genres.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Explora por género" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {genres.map((genre) => (
              <GenreCard key={genre.id} genre={genre} className="w-full" />
            ))}
          </div>
        </section>
      )}

      {top.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Éxitos" />
          <TrackList
            tracks={top.slice(0, 8)}
            favoriteIds={favIds}
            context={{ type: 'discover', title: 'Éxitos' }}
          />
        </section>
      )}

      {albums.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Lo nuevo" />
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