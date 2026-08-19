import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/admin-nav'
import { formatBytes } from '@/lib/utils'
import { Album, Disc3, HardDrive, Music2, Users } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Panel de administración',
}

export default async function AdminPage() {
  const user = await requireAdmin()
  const supabase = await createClient()

  const [profiles, tracks, albums, artists, uploads] = await Promise.all([
    supabase.from('profiles').select('id, is_blocked', { count: 'exact', head: true }),
    supabase.from('tracks').select('id', { count: 'exact', head: true }),
    supabase.from('albums').select('id', { count: 'exact', head: true }),
    supabase.from('artists').select('id', { count: 'exact', head: true }),
    supabase.from('uploads').select('size_bytes'),
  ])

  const storageUsed = (uploads.data ?? []).reduce((acc, u) => acc + (u.size_bytes ?? 0), 0)

  const cards = [
    { label: 'Usuarios', value: profiles.count ?? 0, icon: Users },
    { label: 'Canciones', value: tracks.count ?? 0, icon: Music2 },
    { label: 'Álbumes', value: albums.count ?? 0, icon: Album },
    { label: 'Artistas', value: artists.count ?? 0, icon: Disc3 },
    { label: 'Almacenamiento', value: formatBytes(storageUsed), icon: HardDrive },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold md:text-3xl">Panel</h1>
          <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
            @{user.profile?.username}
          </span>
        </div>
        <AdminNav />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-surface/50 p-4"
          >
            <Icon className="size-5 text-muted" aria-hidden />
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Link
          href="/admin/upload"
          className="group flex flex-col gap-1 rounded-2xl border border-border bg-surface/50 p-5 transition-colors hover:border-accent/60"
        >
          <p className="font-semibold group-hover:text-accent">Subir música</p>
          <p className="text-sm text-muted">
            Añade canciones con arrastrar y soltar. Los metadatos (artista, álbum, portada) se extraen automáticamente.
          </p>
        </Link>
        <Link
          href="/admin/users"
          className="group flex flex-col gap-1 rounded-2xl border border-border bg-surface/50 p-5 transition-colors hover:border-accent/60"
        >
          <p className="font-semibold group-hover:text-accent">Gestionar usuarios</p>
          <p className="text-sm text-muted">
            Crear cuentas, cambiar roles, bloquear o eliminar miembros del grupo.
          </p>
        </Link>
      </div>
    </div>
  )
}