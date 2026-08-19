import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { TRACK_SELECT, rows, type TrackRow } from './library'

// Datos personalizados para la página Descubrir: recomendaciones a partir
// de los géneros más escuchados del usuario y mixes reproducibles por género.

const HISTORY_LIMIT = 1000
const CANDIDATES_LIMIT = 40
const TOP_GENRES_LIMIT = 4
const MIX_TRACKS_LIMIT = 8

export interface DiscoverMix {
  genreId: string
  genreName: string
  title: string
  tracks: TrackRow[]
}

export interface DiscoverData {
  recommended: TrackRow[]
  mixes: DiscoverMix[]
  playedCount: number
}

export async function getDiscoverData(
  userId: string,
  recommendedLimit = 10
): Promise<DiscoverData> {
  const supabase = await createClient()
  const { data: history } = await supabase
    .from('listening_history')
    .select('track_id')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(HISTORY_LIMIT)
  const playedIds = new Set((history ?? []).map((r) => r.track_id))

  // Géneros más escuchados por el usuario (en memoria, como en stats).
  const playedTracks = await getTracksByIdsFor(playedIds)
  const byGenre = new Map<string, { id: string; name: string; count: number }>()
  for (const t of playedTracks) {
    const genre = t.genre
    if (!genre?.name || !t.genre_id) continue
    const entry = byGenre.get(t.genre_id) ?? { id: t.genre_id, name: genre.name, count: 0 }
    entry.count++
    byGenre.set(t.genre_id, entry)
  }
  const topGenres = [...byGenre.values()].sort((a, b) => b.count - a.count).slice(0, TOP_GENRES_LIMIT)

  const recommended: TrackRow[] = []
  const mixes: DiscoverMix[] = []
  if (topGenres.length > 0) {
    const { data } = await supabase
      .from('tracks')
      .select(TRACK_SELECT)
      .in('genre_id', topGenres.map((g) => g.id))
      .order('plays_count', { ascending: false })
      .order('added_at', { ascending: false })
      .limit(CANDIDATES_LIMIT)
    const candidates = rows(data)

    // Recomendaciones: de los géneros del usuario, las que aún no ha
    // escuchado; si no hay suficientes, se rellena con las más escuchadas.
    const unplayed = candidates.filter((t) => !playedIds.has(t.id))
    recommended.push(...unplayed.slice(0, recommendedLimit))
    if (recommended.length < recommendedLimit) {
      const extra = candidates
        .filter((t) => playedIds.has(t.id))
        .slice(0, recommendedLimit - recommended.length)
      recommended.push(...extra)
    }

    for (const g of topGenres) {
      const tracks = candidates.filter((t) => t.genre_id === g.id).slice(0, MIX_TRACKS_LIMIT)
      if (tracks.length > 0) {
        mixes.push({ genreId: g.id, genreName: g.name, title: `Mix de ${g.name}`, tracks })
      }
    }
  }

  return { recommended, mixes, playedCount: playedIds.size }
}

async function getTracksByIdsFor(ids: Set<string>): Promise<TrackRow[]> {
  const list = [...ids].slice(0, 200)
  if (list.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase.from('tracks').select(TRACK_SELECT).in('id', list)
  return rows(data)
}