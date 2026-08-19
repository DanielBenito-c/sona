// Tipos de dominio musical (entidades con relaciones resueltas desde la BD)

import type { FavoriteItemType, FollowableType } from './database'

export interface Artist {
  id: string
  name: string
  image_url?: string | null
  bio?: string | null
  created_at: string
  updated_at?: string
}

export interface Genre {
  id: string
  name: string
}

export interface Album {
  id: string
  title: string
  artist_id: string
  release_year?: number | null
  cover_url?: string | null
  created_at?: string
  updated_at?: string
  // Relaciones opcionales (joins de Supabase)
  artist?: Artist | null
  tracks?: Track[]
}

export interface Track {
  id: string
  title: string
  artist_id: string
  album_id?: string | null
  genre_id?: string | null
  track_number?: number | null
  disc_number?: number
  duration_ms: number
  audio_path: string
  cover_url?: string | null
  lyrics?: string | null
  custom_metadata?: Record<string, unknown>
  plays_count?: number
  added_at?: string
  // Relaciones opcionales (joins de Supabase)
  artist?: Artist | null
  album?: Album | null
  genre?: Genre | null
  // Flags calculados en queries del usuario actual
  is_favorite?: boolean
}

export interface PlaylistTrack {
  id: string
  playlist_id: string
  track_id: string
  position: number
  added_by?: string
  added_at: string
  track?: Track | null
}

export interface Playlist {
  id: string
  owner_id: string
  name: string
  description?: string | null
  cover_url?: string | null
  is_public: boolean
  created_at: string
  updated_at?: string
  owner?: { id: string; username: string; full_name?: string | null } | null
  tracks?: PlaylistTrack[]
  track_count?: number
  total_duration_ms?: number
  is_favorite?: boolean
}

export interface FavoriteItem {
  type: FavoriteItemType
  id: string
  created_at: string
}

export interface FollowItem {
  type: FollowableType
  id: string
  created_at: string
}

export interface RecentlyPlayedItem {
  type: FavoriteItemType
  id: string
  played_at: string
}

// Resultados de búsqueda agrupados
export interface SearchResults {
  tracks: Track[]
  artists: Artist[]
  albums: Album[]
  genres: Genre[]
  playlists: Playlist[]
}

export interface PageResult<T> {
  items: T[]
  nextCursor: string | null
}

export interface RecommendationSeed {
  trackIds: string[]
  artistIds: string[]
  genreIds: string[]
}