'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const notice = searchParams.get('notice')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    router.push('/home')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Bienvenido de nuevo</h2>
        <p className="text-sm text-muted">Inicia sesión para seguir escuchando</p>
      </div>

      {notice && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">{notice}</p>
      )}
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
      <Input
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <Button type="submit" size="lg" loading={loading}>
        Entrar
      </Button>

      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-muted hover:text-foreground">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <p className="text-center text-sm text-muted">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Regístrate
        </Link>
      </p>
    </form>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner className="mx-auto my-10" />}>
      <LoginForm />
    </Suspense>
  )
}