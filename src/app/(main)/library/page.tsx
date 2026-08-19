import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import {
  getAlbums,
  getArtists,
  getFavoriteTracks,
  getGenres,
  getUserPlaylists,
  searchLibrary,
} from '@/lib/library'
import { LibraryTabs } from '@/components/library/library-tabs'

export const metadata: Metadata = {
  title: 'Tu biblioteca',
}

export default async function LibraryPage() {
  const user = await requireUser()

  const [tracks, albums, artists, favorites, playlists, genres] = await Promise.all([
    searchLibrary(user.id, '', null, 60),
    getAlbums(100),
    getArtists(100),
    getFavoriteTracks(user.id, 100),
    getUserPlaylists(user.id),
    getGenres(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-bold md:text-3xl">Tu biblioteca</h1>
      </div>

      <LibraryTabs
        userId={user.id}
        initialTracks={tracks.tracks}
        initialCursor={tracks.nextCursor}
        favoriteIds={new Set(favorites.map((t) => t.id))}
        albums={albums}
        artists={artists}
        genres={genres}
        favoriteTracks={favorites}
        playlists={playlists}
      />
    </div>
  )
}