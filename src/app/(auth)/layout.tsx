import type { Metadata } from 'next'
import { AudioLines } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Accede a tu música en Sona',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Glow de marca */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-accent-2/10 blur-[120px]"
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-gradient-brand flex size-14 items-center justify-center rounded-2xl shadow-lg shadow-accent/30">
            <AudioLines className="size-7 text-white" aria-hidden />
          </div>
          <div className="text-center">
            <h1 className={cn('text-3xl font-bold tracking-tight')}>
              <span className="text-gradient">Sona</span>
            </h1>
            <p className="mt-1 text-sm text-muted">Tu música, solo para los tuyos</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface/80 p-6 backdrop-blur">
          {children}
        </div>
      </div>
    </div>
  )
}