'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, UploadCloud, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard },
  { href: '/admin/upload', label: 'Subir música', icon: UploadCloud },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto" aria-label="Administración">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active =
          href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-surface-hover text-foreground'
                : 'text-muted hover:bg-surface-hover hover:text-foreground'
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}