import Link from 'next/link'
import { Cover } from './cover'
import type { Album, Artist, Genre } from '@/types/music'

export function AlbumCard({ album }: { album: Album }) {
  return (
    <Link
      href={`/album/${album.id}`}
      className="group flex w-36 shrink-0 flex-col gap-2 rounded-xl p-2 transition-colors hover:bg-surface-hover/60 md:w-40"
    >
      <Cover
        src={album.cover_url}
        alt={`Portada de ${album.title}`}
        className="aspect-square w-full rounded-xl"
      />
      <div className="min-w-0 px-1 pb-1">
        <p className="truncate text-sm font-medium group-hover:text-accent">{album.title}</p>
        <p className="truncate text-xs text-muted">
          {album.artist?.name ?? 'Artista desconocido'}
          {album.release_year ? ` · ${album.release_year}` : ''}
        </p>
      </div>
    </Link>
  )
}

export function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <Link
      href={`/artist/${artist.id}`}
      className="group flex w-36 shrink-0 flex-col items-center gap-2 rounded-xl p-2 text-center transition-colors hover:bg-surface-hover/60 md:w-40"
    >
      <Cover
        src={artist.image_url}
        alt={`Foto de ${artist.name}`}
        className="size-28 rounded-full md:size-32"
      />
      <div className="min-w-0 px-1 pb-1">
        <p className="truncate text-sm font-medium group-hover:text-accent">{artist.name}</p>
      </div>
    </Link>
  )
}

export function GenreChip({ genre, className }: { genre: Genre; className?: string }) {
  return (
    <span className={`rounded-full bg-surface-hover px-3.5 py-1.5 text-sm font-medium ${className ?? ''}`}>
      {genre.name}
    </span>
  )
}