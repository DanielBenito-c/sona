'use client'

import Link from 'next/link'
import { AudioLines } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from './user-menu'
import type { Profile } from '@/types/user'

export function TopBar({ profile, title }: { profile: Profile; title?: string }) {
  return (
    <header className="pt-safe md:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-brand flex size-8 items-center justify-center rounded-lg">
            <AudioLines className="size-4 text-white" aria-hidden />
          </div>
          {title && <span className={cn('text-lg font-bold')}>{title}</span>}
        </div>
        <Link href="/profile" aria-label="Tu perfil">
          <Avatar profile={profile} className="size-8" />
        </Link>
      </div>
    </header>
  )
}