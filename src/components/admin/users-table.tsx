'use client'

import { useState } from 'react'
import { Ban, RotateCcw, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { Avatar } from '@/components/layout/user-menu'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/user'

interface Props {
  users: Profile[]
  currentUserId: string
}

export function UsersTable({ users, currentUserId }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ id: string; type: 'ok' | 'error'; text: string } | null>(null)

  async function act(userId: string, action: 'role' | 'block' | 'unblock' | 'delete') {
    setBusyId(userId)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      })
      const data = await res.json()
      setFeedback(
        res.ok
          ? { id: userId, type: 'ok', text: data.message }
          : { id: userId, type: 'error', text: data.error ?? 'Error' }
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {users.map((u) => {
        const isSelf = u.id === currentUserId
        const blocked = u.is_blocked
        return (
          <div
            key={u.id}
            className={cn(
              'flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface/50 p-3',
              blocked && 'opacity-60'
            )}
          >
            <Avatar profile={u} className="size-9" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-sm font-medium">
                {u.full_name || u.username}
                {isSelf && <span className="text-xs text-muted">(tú)</span>}
                {blocked && (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
                    BLOQUEADO
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted">
                @{u.username} · {u.role}
              </p>
            </div>

            {feedback?.id === u.id && (
              <p
                className={cn(
                  'w-full text-xs md:w-auto',
                  feedback.type === 'ok' ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                {feedback.text}
              </p>
            )}

            <div className="flex items-center gap-1">
              {!isSelf && (
                <>
                  <button
                    type="button"
                    disabled={busyId === u.id}
                    onClick={() => act(u.id, 'role')}
                    title={u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                    aria-label={u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                    className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-accent disabled:opacity-40"
                  >
                    {u.role === 'admin' ? (
                      <UserRound className="size-4" />
                    ) : (
                      <ShieldCheck className="size-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === u.id}
                    onClick={() => act(u.id, blocked ? 'unblock' : 'block')}
                    title={blocked ? 'Desbloquear' : 'Bloquear'}
                    aria-label={blocked ? 'Desbloquear' : 'Bloquear'}
                    className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-amber-400 disabled:opacity-40"
                  >
                    {blocked ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === u.id}
                    onClick={() => {
                      if (confirm(`¿Eliminar a @${u.username}? Esta acción no se puede deshacer.`)) {
                        act(u.id, 'delete')
                      }
                    }}
                    title="Eliminar"
                    aria-label="Eliminar"
                    className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-red-400 disabled:opacity-40"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}
      {users.length === 0 && (
        <p className="rounded-xl border border-border bg-surface/50 p-6 text-center text-sm text-muted">
          Todavía no hay usuarios
        </p>
      )}
    </div>
  )
}