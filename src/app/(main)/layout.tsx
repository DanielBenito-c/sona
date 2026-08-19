import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { PlayerBar } from '@/components/player/player-bar'
import { PlayerProvider } from '@/contexts/player-provider'

export const metadata: Metadata = {
  title: { default: 'Sona', template: '%s · Sona' },
}

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  if (!user.profile) return null

  return (
    <PlayerProvider>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar profile={user.profile} />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar profile={user.profile} />
          <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-7xl px-4 pb-[calc(var(--player-height)+3.5rem)] pt-2 md:px-8 md:pb-[calc(var(--player-height)+2rem)] md:pt-6">
              {children}
            </div>
          </main>

          <PlayerBar />
        </div>

        <BottomNav profile={user.profile} />
      </div>
    </PlayerProvider>
  )
}