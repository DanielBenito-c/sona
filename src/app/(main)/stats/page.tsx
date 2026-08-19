import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { getStatsSnapshot } from '@/lib/stats'
import { getFavoriteTrackIds } from '@/lib/library'
import { StatsView } from '@/components/stats/stats-view'

export const metadata: Metadata = {
  title: 'Estadísticas',
}

export default async function StatsPage() {
  const user = await requireUser()

  const snapshot = await getStatsSnapshot(user.id)

  const topTrackIds = [
    ...new Set(Object.values(snapshot).flatMap((p) => p.topTracks.map((t) => t.track.id))),
  ]
  const favIds = await getFavoriteTrackIds(user.id, topTrackIds)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Estadísticas</h1>
        <p className="mt-1 text-sm text-muted">
          Tu escucha resumida por periodo: minutos, reproducciones y rankings.
        </p>
      </div>

      <StatsView snapshot={snapshot} favoriteIds={favIds} />
    </div>
  )
}