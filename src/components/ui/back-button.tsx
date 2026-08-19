'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

// Botón de retroceso estilo Spotify: vuelve a la página anterior del
// historial; si no hay historial (acceso directo), va a href.
export function BackButton({ href = '/library' }: { href?: string }) {
  const router = useRouter()

  function handleClick() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.replace(href)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Volver atrás"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-hover text-foreground transition-colors hover:bg-surface-hover/70 active:scale-95"
    >
      <ArrowLeft aria-hidden className="size-4" />
    </button>
  )
}