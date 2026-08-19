'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Settings, UserRound } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/user'

function Avatar({ profile, className }: { profile: Profile; className?: string }) {
  if (profile.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt={profile.username}
        className={cn('size-9 shrink-0 rounded-full object-cover', className)}
      />
    )
  }
  return (
    <div
      className={cn(
        'bg-gradient-brand flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
        className
      )}
    >
      {(profile.full_name || profile.username).slice(0, 1).toUpperCase()}
    </div>
  )
}

export function UserMenu({ profile }: { profile: Profile }) {
  const router = useRouter()
  const { signOut } = useAuth()

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar profile={profile} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {profile.full_name || profile.username}
        </p>
        <p className="truncate text-xs text-muted">
          @{profile.username}
          {profile.role === 'admin' ? ' · admin' : ''}
        </p>
      </div>
      <div className="flex items-center gap-0.5">
        <Link
          href="/profile"
          aria-label="Ver perfil"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <UserRound className="size-4" />
        </Link>
        <Link
          href="/settings"
          aria-label="Ajustes"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <Settings className="size-4" />
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-red-400"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  )
}

export { Avatar }