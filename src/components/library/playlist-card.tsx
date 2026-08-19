import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Cover } from './cover'
import type { Playlist } from '@/types/music'

// Tarjeta de playlist para cuadrículas (biblioteca, etc.).
export function PlaylistCard({
  playlist,
  className,
}: {
  playlist: Playlist
  className?: string
}) {
  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className={cn(
        'group flex w-36 shrink-0 flex-col gap-2 rounded-xl p-2 transition-colors hover:bg-surface-hover/60 md:w-40',
        className
      )}
    >
      <Cover
        src={playlist.cover_url}
        alt={`Portada de ${playlist.name}`}
        className="aspect-square w-full rounded-xl"
        iconClassName="text-white/60"
      />
      <div className="min-w-0 px-1 pb-1">
        <p className="truncate text-sm font-medium group-hover:text-accent">{playlist.name}</p>
        <p className="truncate text-xs text-muted">
          {playlist.track_count ?? 0} canciones
        </p>
      </div>
    </Link>
  )
}