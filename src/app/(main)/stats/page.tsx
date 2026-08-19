import type { Metadata } from 'next'
import { EmptyState } from '@/components/ui/spinner'
import { BarChart3 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Estadísticas',
}

export default function StatsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold md:text-3xl">Estadísticas</h1>
      <EmptyState
        icon={<BarChart3 className="size-10" />}
        title="Tus números llegarán pronto"
        description="En la Fase 5: minutos escuchados, canciones reproducidas y rankings por periodo (7 días, 30 días, 12 meses, todo)."
      />
    </div>
  )
}