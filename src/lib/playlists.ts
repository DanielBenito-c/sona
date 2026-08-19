'use client'

import { getBrowserClient } from '@/lib/supabase/client'
import type { Playlist } from '@/types/music'

// Acciones de playlist ejecutadas con el cliente del navegador. La RLS
// (migración 0001) ya garantiza que cada usuario solo pueda crear/editar/
// borrar sus propias listas y que solo el dueño (o admin) añada canciones.

export interface PlaylistMutationResult {
  ok: boolean
  error?: string
  playlist?: Playlist
}

export async function createPlaylist(
  name: string,
  description?: string
): Promise<PlaylistMutationResult> {
  const supabase = getBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No hay sesión iniciada.' }
  const { data, error } = await supabase
    .from('playlists')
    .insert({ owner_id: user.id, name, description: description || null })
    .select('id, owner_id, name, description, cover_url, is_public, created_at, updated_at')
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, playlist: data as Playlist }
}

export async function updatePlaylist(
  playlistId: string,
  patch: { name?: string; description?: string | null; is_public?: boolean }
): Promise<PlaylistMutationResult> {
  const supabase = getBrowserClient()
  const { error } = await supabase
    .from('playlists')
    .update(patch)
    .eq('id', playlistId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function deletePlaylist(playlistId: string): Promise<PlaylistMutationResult> {
  const supabase = getBrowserClient()
  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function addTrackToPlaylist(
  playlistId: string,
  trackId: string
): Promise<PlaylistMutationResult> {
  const supabase = getBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No hay sesión iniciada.' }
  const { data: last } = await supabase
    .from('playlist_tracks')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1)
  const position = (last?.[0]?.position ?? 0) + 1
  const { error } = await supabase
    .from('playlist_tracks')
    .insert({ playlist_id: playlistId, track_id: trackId, position, added_by: user.id })
  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Esa canción ya está en la lista.' }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  trackId: string
): Promise<PlaylistMutationResult> {
  const supabase = getBrowserClient()
  const { error } = await supabase
    .from('playlist_tracks')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('track_id', trackId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}