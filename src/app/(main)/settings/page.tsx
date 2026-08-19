'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Feedback = { type: 'ok' | 'error'; text: string } | null

function FeedbackBox({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null
  return (
    <p
      className={
        feedback.type === 'ok'
          ? 'rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400'
          : 'rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400'
      }
    >
      {feedback.text}
    </p>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [changingEmail, setChangingEmail] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null)
  const [emailFeedback, setEmailFeedback] = useState<Feedback>(null)

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordFeedback(null)
    if (password.length < 6) {
      setPasswordFeedback({ type: 'error', text: 'Mínimo 6 caracteres' })
      return
    }
    if (password !== confirmPassword) {
      setPasswordFeedback({ type: 'error', text: 'Las contraseñas no coinciden' })
      return
    }
    setChangingPassword(true)
    const supabase = getBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })
    setChangingPassword(false)
    if (error) {
      setPasswordFeedback({ type: 'error', text: 'No se pudo cambiar la contraseña' })
      return
    }
    setPassword('')
    setConfirmPassword('')
    setPasswordFeedback({ type: 'ok', text: 'Contraseña actualizada' })
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailFeedback(null)
    setChangingEmail(true)
    const supabase = getBrowserClient()
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setChangingEmail(false)
    if (error) {
      setEmailFeedback({ type: 'error', text: 'No se pudo cambiar el email' })
      return
    }
    setNewEmail('')
    setEmailFeedback({
      type: 'ok',
      text: 'Te hemos enviado un correo al nuevo email para confirmarlo',
    })
  }

  async function handleLogout() {
    const supabase = getBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8">
      <h1 className="text-2xl font-bold md:text-3xl">Ajustes</h1>

      <form onSubmit={handlePassword} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Cambiar contraseña</h2>
        <FeedbackBox feedback={passwordFeedback} />
        <Input
          label="Nueva contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Repite la contraseña"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button type="submit" loading={changingPassword}>
          Actualizar contraseña
        </Button>
      </form>

      <form onSubmit={handleEmail} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Cambiar email</h2>
        <FeedbackBox feedback={emailFeedback} />
        <Input
          label="Nuevo email"
          name="email"
          type="email"
          autoComplete="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <Button type="submit" loading={changingEmail}>
          Actualizar email
        </Button>
      </form>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Sesión</h2>
        <Button type="button" variant="danger" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}