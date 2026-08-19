import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/admin-nav'
import { UsersTable } from '@/components/admin/users-table'
import { CreateUserForm } from '@/components/admin/create-user-form'

export const metadata: Metadata = {
  title: 'Gestión de usuarios',
}

export default async function AdminUsersPage() {
  const admin = await requireAdmin()
  const supabase = await createClient()
  const { data: users } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, role, is_blocked, created_at, updated_at')
    .order('created_at', { ascending: true })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold md:text-3xl">Usuarios</h1>
        <AdminNav />
      </div>

      <CreateUserForm />

      <UsersTable users={users ?? []} currentUserId={admin.id} />
    </div>
  )
}