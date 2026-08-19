'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface MenuItem {
  label: string
  icon?: ReactNode
  href?: string
  onSelect?: () => void
  danger?: boolean
  disabled?: boolean
}

interface Props {
  /** Contenido del botón que abre el menú (p. ej. icono de tres puntos). */
  trigger: ReactNode
  /** Texto accesible del botón. */
  triggerLabel: string
  items: MenuItem[]
  align?: 'start' | 'end'
}

// Menú desplegable anclado al botón. Se cierra al hacer clic fuera, pulsar
// Escape o al hacer scroll/resize de la ventana.
export function DropdownMenu({ trigger, triggerLabel, items, align = 'end' }: Props) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function close() {
      setOpen(false)
      setRect(null)
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      close()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  function toggle() {
    if (open) {
      setOpen(false)
      setRect(null)
      return
    }
    const btn = buttonRef.current
    if (!btn) return
    setRect(btn.getBoundingClientRect())
    setOpen(true)
  }

  const itemClass = (item: MenuItem) =>
    cn(
      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
      item.danger ? 'text-red-400 hover:bg-red-500/10' : 'hover:bg-surface-hover',
      item.disabled && 'pointer-events-none opacity-40'
    )

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        className="rounded-full p-2 text-muted transition-colors hover:text-foreground"
      >
        {trigger}
      </button>
      {open && rect && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 max-h-[60dvh] min-w-52 overflow-y-auto rounded-xl border border-border bg-surface/95 p-1.5 shadow-xl shadow-black/50 backdrop-blur"
          style={{
            top: rect.bottom + 6,
            ...(align === 'end'
              ? { right: window.innerWidth - rect.right }
              : { left: rect.left }),
          }}
        >
          {items.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  setRect(null)
                }}
                className={itemClass(item)}
              >
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false)
                  setRect(null)
                  item.onSelect?.()
                }}
                className={itemClass(item)}
              >
                {item.icon}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </>
  )
}