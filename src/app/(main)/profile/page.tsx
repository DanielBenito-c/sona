'use client'

import { useRef, useState } from 'react'
import { Camera, Check } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

export default function ProfilePage() {
  const { user, refresh } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [username, setUsername] = useState(user?.profile?.username ?? '')
  const [fullName, setFullName] = useState(user?.profile?.full_name ?? '')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  if (!user) return null
  const profile = user.profile!
  const avatarUrl = profile.avatar_url

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, full_name: fullName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Error al guardar' })
        return
      }
      await refresh()
      setMessage({ type: 'ok', text: 'Perfil actualizado' })
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatar(file: File) {
    setMessage(null)
    setUploadingAvatar(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Error al subir la imagen' })
        return
      }
      await refresh()
      setMessage({ type: 'ok', text: 'Avatar actualizado' })
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold md:text-3xl">Tu perfil</h1>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadingAvatar}
          className="group relative"
          aria-label="Cambiar avatar"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={profile.username}
              className="size-24 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="bg-gradient-brand flex size-24 items-center justify-center rounded-full text-4xl font-bold text-white ring-2 ring-border">
              {(profile.full_name || profile.username).slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            {uploadingAvatar ? (
              <Spinner className="size-6" />
            ) : (
              <Camera className="size-6 text-white" />
            )}
          </div>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleAvatar(f)
            e.target.value = ''
          }}
        />
        <p className="text-xs text-muted">Toca la foto para cambiarla (JPEG, PNG o WebP, máx. 2 MB)</p>
      </div>

      {message && (
        <p
          className={
            message.type === 'ok'
              ? 'flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400'
              : 'rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400'
          }
        >
          {message.type === 'ok' && <Check className="size-4" />}
          {message.text}
        </p>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 text-sm text-muted">Email</p>
          <p className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm">
            {user.email}
          </p>
        </div>

        <Input
          label="Nombre de usuario"
          name="username"
          required
          minLength={3}
          maxLength={20}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          label="Nombre"
          name="fullName"
          maxLength={60}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <Button type="submit" loading={saving}>
          Guardar cambios
        </Button>
      </form>
    </div>
  )
}