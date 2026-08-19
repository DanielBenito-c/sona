import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { getAlbumDetail, getFavoriteTrackIds } from '@/lib/library'
import { formatTotalDuration } from '@/lib/utils'
import { Cover } from '@/components/library/cover'
import { TrackList } from '@/components/library/track-list'
import { BackButton } from '@/components/ui/back-button'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const detail = await getAlbumDetail(id)
  return { title: detail ? `${detail.album.title} · Sona` : 'Álbum no encontrado' }
}

export default async function AlbumPage({ params }: Props) {
  const user = await requireUser()
  const { id } = await params
  const detail = await getAlbumDetail(id)
  if (!detail) notFound()

  const { album, tracks } = detail
  const favIds = await getFavoriteTrackIds(
    user.id,
    tracks.map((t) => t.id)
  )
  const totalMs = tracks.reduce((acc, t) => acc + t.duration_ms, 0)

  return (
    <div className="flex flex-col gap-6">
      <BackButton href="/library" />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
        <Cover
          src={album.cover_url}
          alt={`Portada de ${album.title}`}
          className="size-40 rounded-2xl md:size-56"
        />
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-widest text-muted uppercase">
            Álbum
          </p>
          <h1 className="mt-1 text-3xl font-bold md:text-4xl">{album.title}</h1>
          <p className="mt-2 text-sm text-muted">
            <Link
              href={`/artist/${album.artist_id}`}
              className="font-medium text-foreground hover:underline"
            >
              {album.artist?.name ?? 'Artista desconocido'}
            </Link>
            {album.release_year ? ` · ${album.release_year}` : ''}
          </p>
          <p className="mt-1 text-xs text-muted">
            {tracks.length} canciones · {formatTotalDuration(totalMs)}
          </p>
        </div>
      </div>

      {tracks.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface/50 px-4 py-8 text-center text-sm text-muted">
          Este álbum no tiene canciones todavía.
        </p>
      ) : (
        <TrackList
          tracks={tracks}
          favoriteIds={favIds}
          context={{ type: 'album', id: album.id, title: album.title }}
        />
      )}
    </div>
  )
}