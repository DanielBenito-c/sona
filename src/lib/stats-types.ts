// Tipos y constantes de estadísticas (sin imports de servidor, seguro para
// componentes cliente). El cálculo vive en ./stats (server-only).

import type { TrackRow } from './library'

export type StatsPeriod = '7d' | '30d' | '12m' | 'all'

export const STATS_PERIODS: { id: StatsPeriod; label: string }[] = [
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: '12m', label: '12 meses' },
  { id: 'all', label: 'Todo' },
]

export interface StatTrack {
  track: TrackRow
  plays: number
  minutes: number
}

export interface StatGroup {
  id: string
  name: string
  plays: number
  minutes: number
}

export interface PeriodStats {
  minutes: number
  plays: number
  uniqueTracks: number
  completed: number
  topTracks: StatTrack[]
  topArtists: StatGroup[]
  topAlbums: StatGroup[]
  topGenres: StatGroup[]
}

export type StatsSnapshot = Record<StatsPeriod, PeriodStats>