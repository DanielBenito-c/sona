import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import {
  getArtists,
  getFavoriteTrackIds,
  getNewAlbums,
  getNewTracks,
  getRecentTracks,
} from '@/lib/library'
import { EmptyState } from '@/components/ui/spinner'
import { SectionHeader } from '@/components/library/section-header'
import { AlbumCard, ArtistCard } from '@/components/library/cards'
import { TrackList } from '@/components/library/track-list'
import { Music2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Inicio',
}

export default async function HomePage() {
  const user = await requireUser()
  const firstName = (user.profile?.full_name || user.profile?.username || '').split(' ')[0]

  const [recent, newTracks, albums, artists] = await Promise.all([
    getRecentTracks(user.id, 20),
    getNewTracks(10),
    getNewAlbums(8),
    getArtists(8),
  ])

  const favIds = await getFavoriteTrackIds(user.id, [
    ...recent.map((t) => t.id),
    ...newTracks.map((t) => t.id),
  ])

  const hasMusic = recent.length > 0 || newTracks.length > 0

  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="text-sm text-muted">Buenos días</p>
        <h1 className="text-2xl font-bold md:text-3xl">
          Hola, <span className="text-gradient">{firstName}</span>
        </h1>
      </div>

      {!hasMusic && (
        <EmptyState
          icon={<Music2 className="size-10" />}
          title="Aún no hay música"
          description="Pide a un administrador que suba las primeras canciones y aparecerán aquí."
        />
      )}

      {recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Escuchado recientemente" />
          <TrackList
            tracks={recent.slice(0, 8)}
            favoriteIds={favIds}
            context={{ type: 'discover', title: 'Escuchado recientemente' }}
          />
        </section>
      )}

      {newTracks.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Añadido recientemente" href="/library" />
          <TrackList
            tracks={newTracks}
            favoriteIds={favIds}
            context={{ type: 'discover', title: 'Añadido recientemente' }}
          />
        </section>
      )}

      {albums.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Nuevos álbumes" href="/library" linkLabel="Ver álbumes" />
          <div className="-mx-2 flex gap-1 overflow-x-auto px-2 pb-1">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      )}

      {artists.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Artistas" href="/library" linkLabel="Ver artistas" />
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