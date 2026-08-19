'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Compass, Home, Library, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/home', label: 'Inicio', icon: Home },
  { href: '/search', label: 'Buscar', icon: Search },
  { href: '/discover', label: 'Descubrir', icon: Compass },
  { href: '/library', label: 'Biblioteca', icon: Library },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
      aria-label="Navegación principal"
    >
      <div className="grid h-14 grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                active ? 'text-accent' : 'text-muted hover:text-foreground'
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}