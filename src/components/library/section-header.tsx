import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export function SectionHeader({
  title,
  href,
  linkLabel,
}: {
  title: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-0.5 text-sm text-muted transition-colors hover:text-accent"
        >
          {linkLabel ?? 'Ver todo'}
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      )}
    </div>
  )
}