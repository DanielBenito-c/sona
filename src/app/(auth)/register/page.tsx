'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RegisterPage() {
  const router = useRouter()
  const { signUp } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    const { error } = await signUp(email.trim(), password, fullName.trim() || undefined)
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    setSuccess(
      'Cuenta creada. Revisa tu correo para confirmar el email y luego inicia sesión.'
    )
    setTimeout(() => router.push('/login?notice=email-confirmado'), 4000)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Crea tu cuenta</h2>
        <p className="text-sm text-muted">Únete a la biblioteca de Sona</p>
      </div>

      {success && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">{success}</p>
      )}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      <Input
        label="Nombre"
        name="fullName"
        autoComplete="name"
        placeholder="Tu nombre"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
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
      <Input
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="Mínimo 6 caracteres"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <Button type="submit" size="lg" loading={loading}>
        Crear cuenta
      </Button>

      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  )
}