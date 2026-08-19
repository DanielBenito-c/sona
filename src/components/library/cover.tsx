import { Music2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Portada con fallback degradado cuando no hay imagen.
export function Cover({
  src,
  alt,
  className,
  iconClassName,
  rounded = 'rounded-lg',
}: {
  src?: string | null
  alt: string
  className?: string
  iconClassName?: string
  rounded?: string
}) {
  return (
    <div
      className={cn(
        'bg-gradient-brand/30 relative flex shrink-0 items-center justify-center overflow-hidden',
        rounded,
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" className="size-full object-cover" />
      ) : (
        <Music2
          aria-hidden
          className={cn('size-1/3 text-white/40', iconClassName)}
        />
      )}
    </div>
  )
}