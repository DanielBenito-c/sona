import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getFavoriteTrackIds, getPlaylistDetail } from '@/lib/library'
import { formatTotalDuration } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { Cover } from '@/components/library/cover'
import { PlaylistClient } from '@/components/playlist/playlist-client'
import { BackButton } from '@/components/ui/back-button'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('playlists')
    .select('name')
    .eq('id', id)
    .maybeSingle()
  return { title: data ? `${data.name} · Sona` : 'Lista no encontrada' }
}

export default async function PlaylistPage({ params }: Props) {
  const user = await requireUser()
  const { id } = await params
  const detail = await getPlaylistDetail(id, user.id)
  if (!detail) notFound()

  const { playlist, tracks, track_count, total_duration_ms, is_owner } = detail
  const favIds = await getFavoriteTrackIds(
    user.id,
    tracks.map((t) => t.id)
  )

  return (
    <div className="flex flex-col gap-6">
      <BackButton href="/library" />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
        <Cover
          src={playlist.cover_url}
          alt={`Portada de ${playlist.name}`}
          className="size-40 rounded-2xl md:size-56"
        />
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-widest text-muted uppercase">Lista</p>
          <h1 className="mt-1 text-3xl font-bold md:text-4xl">{playlist.name}</h1>
          {playlist.description && (
            <p className="mt-2 line-clamp-3 max-w-xl text-sm whitespace-pre-line text-muted">
              {playlist.description}
            </p>
          )}
          <p className="mt-2 text-sm text-muted">
            {playlist.owner?.username ?? 'Tú'}
            {' · '}
            {track_count} canciones · {formatTotalDuration(total_duration_ms)}
          </p>
        </div>
      </div>

      <PlaylistClient
        playlist={playlist}
        tracks={tracks}
        favoriteIds={favIds}
        isOwner={is_owner}
      />
    </div>
  )
}