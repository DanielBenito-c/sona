'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = getBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError('No se pudo enviar el correo. Comprueba el email e inténtalo de nuevo.')
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h2 className="text-xl font-semibold">Revisa tu correo</h2>
        <p className="text-sm text-muted">
          Te hemos enviado un enlace para restablecer tu contraseña a <b>{email}</b>.
        </p>
        <Link href="/login" className="text-sm font-medium text-accent hover:underline">
          Volver al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Recuperar contraseña</h2>
        <p className="text-sm text-muted">
          Te enviaremos un enlace para restablecerla.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Button type="submit" size="lg" loading={loading}>
        Enviar enlace
      </Button>

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-accent hover:underline">
          Volver
        </Link>
      </p>
    </form>
  )
}