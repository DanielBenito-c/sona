'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  AudioLines,
  BarChart3,
  Compass,
  Home,
  Library,
  ListMusic,
  Search,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/user'
import { UserMenu } from './user-menu'

const NAV_ITEMS = [
  { href: '/home', label: 'Inicio', icon: Home },
  { href: '/search', label: 'Buscar', icon: Search },
  { href: '/discover', label: 'Descubrir', icon: Compass },
  { href: '/library', label: 'Tu biblioteca', icon: Library },
  { href: '/queue', label: 'Cola', icon: ListMusic },
  { href: '/stats', label: 'Estadísticas', icon: BarChart3 },
]

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface/40 md:flex">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <div className="bg-gradient-brand flex size-9 items-center justify-center rounded-xl">
          <AudioLines className="size-5 text-white" aria-hidden />
        </div>
        <span className="text-xl font-bold">
          <span className="text-gradient">Sona</span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-surface-hover text-foreground'
                  : 'text-muted hover:bg-surface-hover hover:text-foreground'
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          )
        })}

        {profile.role === 'admin' && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              pathname.startsWith('/admin')
                ? 'bg-surface-hover text-foreground'
                : 'text-muted hover:bg-surface-hover hover:text-foreground'
            )}
          >
            <Shield className="size-5" aria-hidden />
            Administración
          </Link>
        )}
      </nav>

      <div className="border-t border-border p-3">
        <UserMenu profile={profile} />
      </div>
    </aside>
  )
}