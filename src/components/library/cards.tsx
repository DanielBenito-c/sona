import Link from 'next/link'
import { Music2 } from 'lucide-react'
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
    <Link
      href={`/genre/${genre.id}`}
      className={`rounded-full bg-surface-hover px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-accent/20 hover:text-accent ${className ?? ''}`}
    >
      {genre.name}
    </Link>
  )
}

// Degradados deterministas por id de género (estilo Spotify).
const GENRE_GRADIENTS = [
  'from-pink-500 to-rose-600',
  'from-violet-500 to-purple-700',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-orange-400 to-red-500',
  'from-cyan-400 to-blue-500',
  'from-fuchsia-500 to-pink-600',
  'from-amber-400 to-orange-500',
  'from-lime-500 to-green-600',
  'from-sky-400 to-cyan-600',
]

export function genreGradient(genreId: string): string {
  let hash = 0
  for (const ch of genreId) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return GENRE_GRADIENTS[Math.abs(hash) % GENRE_GRADIENTS.length]
}

export function GenreCard({ genre, className }: { genre: Genre; className?: string }) {
  return (
    <Link
      href={`/genre/${genre.id}`}
      className={`group relative flex h-28 shrink-0 flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-br p-3 text-white shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 ${genreGradient(genre.id)} ${className ?? ''}`}
    >
      <span className="text-base font-bold drop-shadow-sm">{genre.name}</span>
      <span className="text-xs font-medium text-white/80">
        {genre.track_count ?? 0} canciones
      </span>
      <Music2
        aria-hidden
        className="absolute -right-2 -bottom-2 size-16 rotate-12 text-white/25 transition-transform group-hover:rotate-6 group-hover:scale-110"
      />
    </Link>
  )
}