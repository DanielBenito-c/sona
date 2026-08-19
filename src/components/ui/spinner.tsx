import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className={cn(
        'size-6 animate-spin rounded-full border-2 border-border border-t-accent',
        className
      )}
    />
  )
}

export function PageLoading({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      <Spinner className="size-8" />
      {label && <p className="text-sm text-muted">{label}</p>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="max-w-xs text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}