'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    const supabase = getBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError('No se pudo cambiar la contraseña. El enlace puede haber caducado.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h2 className="text-xl font-semibold">Contraseña actualizada</h2>
        <p className="text-sm text-muted">Ya puedes iniciar sesión con tu nueva contraseña.</p>
        <Link href="/login" className="text-sm font-medium text-accent hover:underline">
          Ir al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Nueva contraseña</h2>
        <p className="text-sm text-muted">Elige una contraseña segura.</p>
      </div>

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      <Input
        label="Nueva contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="Mínimo 6 caracteres"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Input
        label="Repite la contraseña"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />

      <Button type="submit" size="lg" loading={loading}>
        Guardar contraseña
      </Button>
    </form>
  )
}