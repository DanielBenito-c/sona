import type { Track } from './music'

export type RepeatMode = 'off' | 'all' | 'one'

export interface QueueContext {
  type: 'album' | 'playlist' | 'artist' | 'track' | 'favorites' | 'search' | 'discover' | 'queue' | 'genre' | 'stats'
  id?: string
  title?: string
}

export interface PlayerSnapshot {
  currentTrack: Track | null
  queue: Track[]
  queueIndex: number
  isPlaying: boolean
  positionMs: number
  durationMs: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  context: QueueContext | null
}

export interface PlayerApi {
  // Carga y reproduce
  playTrack: (track: Track, context?: QueueContext) => void
  playTracks: (tracks: Track[], startIndex: number, context?: QueueContext) => void
  // Cola
  addToQueue: (track: Track) => void
  playNext: (track: Track) => void
  removeFromQueue: (index: number) => void
  reorderQueue: (from: number, to: number) => void
  clearQueue: () => void
  // Controles
  togglePlay: () => void
  next: () => void
  previous: () => void
  seekTo: (ms: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
}

// Payload de historial enviado al servidor
export interface HistoryPayload {
  track_id: string
  duration_played_ms: number
  completed: boolean
}