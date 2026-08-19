'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function CreateUserForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Error al crear el usuario' })
        return
      }
      setMessage({ type: 'ok', text: `Usuario creado: ${data.username}` })
      setEmail('')
      setPassword('')
      setFullName('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/50 p-4"
    >
      <p className="font-semibold">Crear usuario</p>
      <div className="grid gap-3 md:grid-cols-3">
        <Input
          label="Email"
          name="email"
          type="email"
          required
          placeholder="nuevo@miembro.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Contraseña"
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Nombre (opcional)"
          name="fullName"
          placeholder="Nombre y apellidos"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      {message && (
        <p
          className={
            message.type === 'ok'
              ? 'text-sm text-emerald-400'
              : 'text-sm text-red-400'
          }
        >
          {message.text}
        </p>
      )}
      <div>
        <Button type="submit" size="sm" loading={loading}>
          Crear cuenta
        </Button>
      </div>
    </form>
  )
}