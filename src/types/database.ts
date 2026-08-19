// Tipos de la base de datos Supabase (manualmente mantenidos hasta
// generar con `supabase gen types typescript`). Coinciden con
// supabase/migrations/0001_init.sql
//
// NOTA: se usan type aliases (no interfaces) porque los tipos de
// supabase-js exigen Record<string, unknown> (index signature).

export type Role = 'admin' | 'user'

export type ProfileRow = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  role: Role
  is_blocked: boolean
  created_at: string
  updated_at: string
}

export type UserSettingsRow = {
  user_id: string
  theme: 'dark' | 'light'
  volume: number
  shuffle: boolean
  repeat_mode: 'off' | 'all' | 'one'
  updated_at: string
}

export type GenreRow = {
  id: string
  name: string
  created_at: string
}

export type ArtistRow = {
  id: string
  name: string
  image_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export type AlbumRow = {
  id: string
  title: string
  artist_id: string
  release_year: number | null
  cover_url: string | null
  created_at: string
  updated_at: string
}

export type TrackRow = {
  id: string
  title: string
  artist_id: string
  album_id: string | null
  genre_id: string | null
  track_number: number | null
  disc_number: number
  duration_ms: number
  audio_path: string
  cover_url: string | null
  search_text: string | null
  title_norm: string | null
  lyrics: string | null
  custom_metadata: Record<string, unknown>
  plays_count: number
  added_at: string
  created_at: string
  updated_at: string
}

export type TrackArtistRow = {
  track_id: string
  artist_id: string
  position: number
}

export type PlaylistRow = {
  id: string
  owner_id: string
  name: string
  description: string | null
  cover_url: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export type PlaylistTrackRow = {
  id: string
  playlist_id: string
  track_id: string
  position: number
  added_by: string
  added_at: string
}

export type FavoriteItemType = 'track' | 'album' | 'artist' | 'playlist'

export type FavoriteRow = {
  id: string
  user_id: string
  item_type: FavoriteItemType
  item_id: string
  created_at: string
}

export type FollowableType = 'artist' | 'user' | 'playlist'

export type FollowRow = {
  id: string
  follower_id: string
  followable_type: FollowableType
  followable_id: string
  created_at: string
}

export type ListeningHistoryRow = {
  id: number
  user_id: string
  track_id: string
  played_at: string
  duration_played_ms: number
  completed: boolean
}

export type RecentlyPlayedRow = {
  id: string
  user_id: string
  item_type: FavoriteItemType
  item_id: string
  played_at: string
}

export type QueueRow = {
  id: string
  user_id: string
  track_id: string
  position: number
  context: Record<string, unknown>
  created_at: string
}

export type UploadStatus = 'pending' | 'processing' | 'done' | 'error' | 'cancelled'

export type UploadRow = {
  id: string
  user_id: string
  filename: string
  size_bytes: number
  mime_type: string
  status: UploadStatus
  error: string | null
  track_id: string | null
  created_at: string
  updated_at: string
}

// Índice cartesiano para tipar FKs (RelationName -> columnas)
type Relationship<
  Relation extends string,
  Columns extends string[],
> = {
  foreignKeyName: string
  columns: Columns
  isOneToOne?: boolean
  referencedRelation: Relation
  referencedColumns: ['id']
}

type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>, Rel extends unknown[] = []> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: Rel
}

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow>
      user_settings: TableDef<UserSettingsRow>
      genres: TableDef<GenreRow>
      artists: TableDef<ArtistRow>
      albums: TableDef<AlbumRow, Partial<AlbumRow>, Partial<AlbumRow>, [
        Relationship<'artists', ['artist_id']>,
      ]>
      tracks: TableDef<TrackRow, Partial<TrackRow>, Partial<TrackRow>, [
        Relationship<'artists', ['artist_id']>,
        Relationship<'albums', ['album_id']>,
        Relationship<'genres', ['genre_id']>,
      ]>
      track_artists: TableDef<TrackArtistRow, Partial<TrackArtistRow>, Partial<TrackArtistRow>, [
        Relationship<'tracks', ['track_id']>,
        Relationship<'artists', ['artist_id']>,
      ]>
      playlists: TableDef<PlaylistRow, Partial<PlaylistRow>, Partial<PlaylistRow>, [
        Relationship<'profiles', ['owner_id']>,
      ]>
      playlist_tracks: TableDef<PlaylistTrackRow, Partial<PlaylistTrackRow>, Partial<PlaylistTrackRow>, [
        Relationship<'playlists', ['playlist_id']>,
        Relationship<'tracks', ['track_id']>,
      ]>
      favorites: TableDef<FavoriteRow>
      follows: TableDef<FollowRow>
      listening_history: TableDef<ListeningHistoryRow>
      recently_played: TableDef<RecentlyPlayedRow>
      queue: TableDef<QueueRow>
      uploads: TableDef<UploadRow>
    }
    Views: Record<string, never>
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      reindex_playlist: { Args: { p_playlist: string }; Returns: void }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}