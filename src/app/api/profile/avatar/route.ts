import { NextResponse, type NextRequest } from 'next/server'
import { requireUserOrThrow } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase/admin'
import { BUCKETS, getStorageProvider } from '@/lib/storage'

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024 // 2 MB

export async function POST(request: NextRequest) {
  try {
    const user = await requireUserOrThrow()

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo no enviado' }, { status: 400 })
    }

    if (!ACCEPTED_MIME.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato no permitido (JPEG, PNG o WebP)' },
        { status: 400 }
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'La imagen no puede superar 2 MB' }, { status: 400 })
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `avatars/${user.id}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const storage = getStorageProvider()
    await storage.upload(BUCKETS.covers, path, new Uint8Array(buffer), file.type, {
      upsert: true,
    })

    const avatarUrl = storage.getPublicUrl(BUCKETS.covers, path)
    const { error } = await getAdminClient()
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)
    if (error) {
      return NextResponse.json({ error: 'No se pudo guardar el avatar' }, { status: 500 })
    }

    return NextResponse.json({ avatarUrl })
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}