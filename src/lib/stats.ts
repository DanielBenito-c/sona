import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getTracksByIds, type TrackRow } from './library'
import type {
  PeriodStats,
  StatsPeriod,
  StatsSnapshot,
  StatGroup,
  StatTrack,
} from './stats-types'

// Estadísticas de escucha del usuario a partir de listening_history.
// Se calculan en memoria para los 4 periodos (sin RPCs en la BD).

const PERIOD_MS: Record<StatsPeriod, number> = {
  '7d': 7 * 86_400_000,
  '30d': 30 * 86_400_000,
  '12m': 365 * 86_400_000,
  all: Infinity,
}

interface HistoryRow {
  track_id: string
  played_at: string
  duration_played_ms: number
  completed: boolean
}

const TOP_TRACKS_COUNT = 10
const TOP_GROUP_COUNT = 8

export async function getStatsSnapshot(userId: string): Promise<StatsSnapshot> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('listening_history')
    .select('track_id, played_at, duration_played_ms, completed')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(20_000)
  const history = (data ?? []) as HistoryRow[]
  const now = Date.now()

  const snapshot = {} as StatsSnapshot
  for (const period of ['7d', '30d', '12m', 'all'] as StatsPeriod[]) {
    const cutoff = now - PERIOD_MS[period]
    const rows = history.filter((r) => new Date(r.played_at).getTime() >= cutoff)
    snapshot[period] = await computePeriod(rows)
  }
  return snapshot
}

async function computePeriod(rows: HistoryRow[]): Promise<PeriodStats> {
  // Agrupación por canción (top 50 para resolver, top 10 para mostrar).
  const byTrack = new Map<string, { plays: number; minutes: number }>()
  let completed = 0
  for (const r of rows) {
    const entry = byTrack.get(r.track_id) ?? { plays: 0, minutes: 0 }
    entry.plays++
    entry.minutes += r.duration_played_ms
    byTrack.set(r.track_id, entry)
    if (r.completed) completed++
  }

  const ranked = [...byTrack.entries()].sort(
    (a, b) => b[1].plays - a[1].plays || b[1].minutes - a[1].minutes
  )
  const topIds = ranked.slice(0, 50).map(([id]) => id)
  const tracks = await getTracksByIds(topIds)
  const byId = new Map(tracks.map((t) => [t.id, t]))

  const topTracks: StatTrack[] = ranked
    .slice(0, TOP_TRACKS_COUNT)
    .map(([id, s]) => {
      const track = byId.get(id)
      return track
        ? { track, plays: s.plays, minutes: Math.round(s.minutes / 60_000) }
        : null
    })
    .filter((t): t is StatTrack => Boolean(t))

  const group = (key: (t: TrackRow) => { id: string; name: string } | null) => {
    const map = new Map<string, StatGroup>()
    for (const [id, s] of ranked) {
      const track = byId.get(id)
      if (!track) continue
      const g = key(track)
      if (!g) continue
      const entry = map.get(g.id) ?? { id: g.id, name: g.name, plays: 0, minutes: 0 }
      entry.plays += s.plays
      entry.minutes += s.minutes
      map.set(g.id, entry)
    }
    return [...map.values()]
      .sort((a, b) => b.plays - a.plays || b.minutes - a.minutes)
      .slice(0, TOP_GROUP_COUNT)
      .map((g) => ({ ...g, minutes: Math.round(g.minutes / 60_000) }))
  }

  return {
    minutes: Math.round(rows.reduce((acc, r) => acc + r.duration_played_ms, 0) / 60_000),
    plays: rows.length,
    uniqueTracks: byTrack.size,
    completed,
    topTracks,
    topArtists: group((t) => ({
      id: t.artist?.id ?? t.artist_id,
      name: t.artist?.name ?? 'Artista desconocido',
    })),
    topAlbums: group((t) =>
      t.album_id && t.album?.title
        ? { id: t.album_id, name: t.album.title }
        : null
    ),
    topGenres: group((t) =>
      t.genre?.name ? { id: t.genre_id ?? '', name: t.genre.name } : null
    ),
  }
}