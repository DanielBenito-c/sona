'use client'

import { useState } from 'react'
import { BarChart3, CheckCircle2, Clock3, Disc3, ListMusic, Mic2, Music2, Shapes } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATS_PERIODS, type PeriodStats, type StatsPeriod, type StatsSnapshot } from '@/lib/stats-types'
import { TrackList } from '@/components/library/track-list'
import { EmptyState } from '@/components/ui/spinner'

// Visualización de estadísticas de escucha con selector de periodo.
// Las cuatro métricas y los rankings (canciones, artistas, álbumes, géneros)
// se calculan en el servidor y se reciben ya resueltas.

interface Props {
  snapshot: StatsSnapshot
  favoriteIds: Set<string>
}

function formatMinutes(min: number): string {
  if (min < 1) return '0 min'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Clock3
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface/50 p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon aria-hidden className="size-4" />
        <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}

function GroupRanking({
  title,
  groups,
  icon: Icon,
}: {
  title: string
  groups: PeriodStats['topArtists']
  icon: typeof Mic2
}) {
  if (groups.length === 0) return null
  const max = groups[0].plays || 1
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-muted">
        <Icon aria-hidden className="size-4" />
        {title}
      </h3>
      <div className="flex flex-col gap-2">
        {groups.map((g, i) => (
          <div key={g.id} className="rounded-xl border border-border bg-surface/50 px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-medium">
                <span className="mr-2 text-xs text-muted tabular-nums">{i + 1}</span>
                {g.name}
              </p>
              <p className="shrink-0 text-xs text-muted tabular-nums">
                {g.plays} {g.plays === 1 ? 'vez' : 'veces'} · {formatMinutes(g.minutes)}
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-hover">
              <div
                className="bg-gradient-brand h-full rounded-full"
                style={{ width: `${Math.max((g.plays / max) * 100, 4)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function StatsView({ snapshot, favoriteIds }: Props) {
  const [period, setPeriod] = useState<StatsPeriod>('30d')
  const stats = snapshot[period]
  const empty = stats.plays === 0 && stats.minutes === 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1 overflow-x-auto">
        {STATS_PERIODS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPeriod(id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              period === id
                ? 'bg-gradient-brand text-white'
                : 'text-muted hover:bg-surface-hover hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {empty ? (
        <EmptyState
          icon={<BarChart3 className="size-10" />}
          title="Sin datos en este periodo"
          description="Escucha música para empezar a ver tus estadísticas."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={Clock3} label="Minutos" value={formatMinutes(stats.minutes)} />
            <StatCard icon={ListMusic} label="Reproducciones" value={String(stats.plays)} />
            <StatCard icon={Music2} label="Canciones" value={String(stats.uniqueTracks)} hint="distintas" />
            <StatCard icon={CheckCircle2} label="Completadas" value={String(stats.completed)} />
          </div>

          {stats.topTracks.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted">
                <Disc3 aria-hidden className="size-4" />
                Tus canciones más escuchadas
              </h3>
              <TrackList
                tracks={stats.topTracks.map((t) => t.track)}
                favoriteIds={favoriteIds}
                context={{ type: 'stats', title: 'Tus canciones más escuchadas' }}
              />
            </section>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <GroupRanking title="Top artistas" groups={stats.topArtists} icon={Mic2} />
            <GroupRanking title="Top álbumes" groups={stats.topAlbums} icon={Disc3} />
            <GroupRanking title="Top géneros" groups={stats.topGenres} icon={Shapes} />
          </div>
        </>
      )}
    </div>
  )
}