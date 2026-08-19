'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import { getBrowserClient } from '@/lib/supabase/client'
import { formatArtists } from '@/lib/utils'
import type { Track } from '@/types/music'
import type { QueueContext, RepeatMode } from '@/types/player'

// Provider global del reproductor (Fase 3). El elemento <audio> vive aquí una
// sola vez y persiste entre navegaciones. El estado es client-side; la cola y
// los ajustes (volumen, shuffle, repeat) se persisten en la tabla `queue` y
// `user_settings`. El historial se registra al terminar/pausar una canción con
// suficiente tiempo reproducido (≥30 s o ≥60 %) y el trigger de la BD deduplica.

interface State {
  queue: Track[]
  index: number
  current: Track | null
  isPlaying: boolean
  isLoading: boolean
  positionMs: number
  durationMs: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  context: QueueContext | null
}

const INITIAL: State = {
  queue: [],
  index: -1,
  current: null,
  isPlaying: false,
  isLoading: false,
  positionMs: 0,
  durationMs: 0,
  volume: 80,
  muted: false,
  shuffle: false,
  repeat: 'off',
  context: null,
}

type Action =
  | { type: 'LOAD_STATE'; state: Partial<State> }
  | { type: 'SET_QUEUE'; queue: Track[]; index: number; context: QueueContext | null }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'LOADING'; loading: boolean }
  | { type: 'TIME'; positionMs: number; durationMs: number }
  | { type: 'VOLUME'; volume: number }
  | { type: 'MUTE'; muted: boolean }
  | { type: 'SHUFFLE'; shuffle: boolean }
  | { type: 'REPEAT'; repeat: RepeatMode }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, ...action.state }
    case 'SET_QUEUE':
      return {
        ...state,
        queue: action.queue,
        index: action.index,
        context: action.context,
        current: action.queue[action.index] ?? null,
      }
    case 'PLAY':
      return { ...state, isPlaying: true }
    case 'PAUSE':
      return { ...state, isPlaying: false }
    case 'LOADING':
      return { ...state, isLoading: action.loading }
    case 'TIME':
      return { ...state, positionMs: action.positionMs, durationMs: action.durationMs }
    case 'VOLUME':
      return { ...state, volume: action.volume }
    case 'MUTE':
      return { ...state, muted: action.muted }
    case 'SHUFFLE':
      return { ...state, shuffle: action.shuffle }
    case 'REPEAT':
      return { ...state, repeat: action.repeat }
    default:
      return state
  }
}

interface PlayerContextValue extends State {
  /** Índice de la canción actual en la cola (alias de `index`). */
  queueIndex: number
  playTrack: (track: Track, context?: QueueContext) => void
  playTracks: (tracks: Track[], startIndex: number, context?: QueueContext) => void
  addToQueue: (track: Track) => void
  playNext: (track: Track) => void
  removeFromQueue: (index: number) => void
  reorderQueue: (from: number, to: number) => void
  clearQueue: () => void
  togglePlay: () => void
  next: () => void
  previous: () => void
  seekTo: (ms: number) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

const REPEAT_ORDER: RepeatMode[] = ['off', 'all', 'one']

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlCacheRef = useRef(new Map<string, string>())
  const startedAtRef = useRef(0)
  const reportedRef = useRef<string | null>(null)
  const playTokenRef = useRef(0)
  const originalOrderRef = useRef<Track[]>([])
  const hydratedRef = useRef(false)
  const userIdRef = useRef<string | null>(null)

  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // --- Persistencia de ajustes + carga inicial --------------------------------
  useEffect(() => {
    const supabase = getBrowserClient()

    async function hydrate() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      userIdRef.current = user?.id ?? null

      const [settings, queueRows] = await Promise.all([
        supabase.from('user_settings').select('volume, shuffle, repeat_mode').maybeSingle(),
        supabase
          .from('queue')
          .select('track_id, context')
          .order('position', { ascending: true }),
      ])

      const s = settings.data
      if (s) {
        dispatch({
          type: 'LOAD_STATE',
          state: {
            volume: s.volume ?? 80,
            shuffle: s.shuffle ?? false,
            repeat: (s.repeat_mode as RepeatMode) ?? 'off',
          },
        })
      }

      const trackIds = (queueRows.data ?? []).map((r) => r.track_id)
      if (trackIds.length > 0) {
        const { data: tracks } = await supabase
          .from('tracks')
          .select('*, artist:artist_id(name), artists:track_artists(position, artist:artist_id(id, name)), album:album_id(title, cover_url)')
          .in('id', trackIds)
        const byId = new Map((tracks ?? []).map((t) => [t.id, t]))
        const queue = trackIds
          .map((id) => byId.get(id))
          .filter((t): t is NonNullable<typeof t> => Boolean(t))
          .map((t) => {
            const raw = t as unknown as {
              artist?: { name: string } | null
              artists?: { position: number; artist: { id: string; name: string } }[] | null
              album?: { title: string; cover_url: string | null } | null
            }
            return {
              ...t,
              artist: raw.artist ?? null,
              artists:
                raw.artists?.slice().sort((a, b) => a.position - b.position).map((a) => a.artist) ?? null,
              album: raw.album ?? null,
            } as unknown as Track
          })
        const ctx = (queueRows.data?.[0]?.context ?? null) as QueueContext | null
        dispatch({
          type: 'SET_QUEUE',
          queue,
          index: -1,
          context: ctx,
        })
      }
      hydratedRef.current = true
    }

    void hydrate()
  }, [])

  // Persistir volumen / shuffle / repeat (debounced).
  useEffect(() => {
    if (!hydratedRef.current || !userIdRef.current) return
    const timeout = setTimeout(() => {
      const supabase = getBrowserClient()
      void supabase
        .from('user_settings')
        .upsert({
          user_id: userIdRef.current as string,
          volume: state.volume,
          shuffle: state.shuffle,
          repeat_mode: state.repeat,
        })
        .then(({ error }) => {
          if (error) {
            console.error('No se pudieron guardar los ajustes:', error.message)
          }
        })
    }, 800)
    return () => clearTimeout(timeout)
  }, [state.volume, state.shuffle, state.repeat])

  // Persistir la cola (borra y reinserta; cap de 500).
  useEffect(() => {
    if (!hydratedRef.current || !userIdRef.current) return
    const timeout = setTimeout(async () => {
      const supabase = getBrowserClient()
      const rows = state.queue.slice(0, 500).map((t, i) => ({
        user_id: userIdRef.current as string,
        track_id: t.id,
        position: i,
        context: (state.context ?? {}) as object,
      }))
      const { error: delErr } = await supabase.from('queue').delete().eq('user_id', userIdRef.current as string)
      if (delErr) {
        console.error('No se pudo limpiar la cola:', delErr.message)
        return
      }
      if (rows.length === 0) return
      for (let i = 0; i < rows.length; i += 50) {
        const { error } = await supabase.from('queue').insert(rows.slice(i, i + 50))
        if (error) console.error('No se pudo guardar la cola:', error.message)
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [state.queue, state.context])

  // --- Carga y reproducción ---------------------------------------------------
  const ensureAudioUrl = useCallback(async (track: Track): Promise<string | null> => {
    const cached = urlCacheRef.current.get(track.audio_path)
    if (cached) return cached
    try {
      const res = await fetch(`/api/audio/url?path=${encodeURIComponent(track.audio_path)}`)
      if (!res.ok) return null
      const data = await res.json()
      urlCacheRef.current.set(track.audio_path, data.url)
      return data.url
    } catch {
      return null
    }
  }, [])

  const loadAndPlay = useCallback(async (track: Track) => {
    const audio = audioRef.current
    if (!audio) return
    const token = ++playTokenRef.current
    dispatch({ type: 'LOADING', loading: true })
    reportedRef.current = null
    const url = await ensureAudioUrl(track)
    if (token !== playTokenRef.current || !url) {
      dispatch({ type: 'LOADING', loading: false })
      if (token === playTokenRef.current) {
        // Fallback: avanza a la siguiente canción si no se pudo cargar.
        dispatch({ type: 'PAUSE' })
      }
      return
    }
    if (audio.src !== url) {
      audio.src = url
    }
    startedAtRef.current = 0
    await audio.play().catch(() => {
      dispatch({ type: 'PAUSE' })
    })
  }, [ensureAudioUrl])

  const playTracks = useCallback(
    (tracks: Track[], startIndex: number, context?: QueueContext) => {
      if (tracks.length === 0) return
      dispatch({ type: 'SET_QUEUE', queue: tracks, index: startIndex, context: context ?? null })
      originalOrderRef.current = [...tracks]
      const next = tracks[startIndex]
      if (next) void loadAndPlay(next)
    },
    [loadAndPlay]
  )

  const playTrack = useCallback(
    (track: Track, context?: QueueContext) => {
      playTracks([track], 0, context)
    },
    [playTracks]
  )

  // --- Efectos del audio ------------------------------------------------------
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlay = () => {
      startedAtRef.current = audio.currentTime * 1000
      dispatch({ type: 'PLAY' })
      dispatch({ type: 'LOADING', loading: false })
    }
    const onPause = () => {
      dispatch({ type: 'PAUSE' })
      // Historial: si se ha reproducido lo suficiente, se registra.
      const t = stateRef.current.current
      if (t) {
        const playedMs = audio.currentTime * 1000 - startedAtRef.current
        const dur = audio.duration ? audio.duration * 1000 : 0
        const threshold = Math.min(30_000, dur * 0.6)
        if (playedMs >= threshold && reportedRef.current !== t.id) {
          reportedRef.current = t.id
          void insertHistory(t.id, Math.round(playedMs), false)
        }
      }
    }
    const onTimeUpdate = () => {
      const dur = audio.duration ? audio.duration * 1000 : 0
      dispatch({ type: 'TIME', positionMs: audio.currentTime * 1000, durationMs: dur })
    }
    const onLoadedMetadata = () => {
      const dur = audio.duration ? audio.duration * 1000 : 0
      dispatch({ type: 'TIME', positionMs: 0, durationMs: dur })
    }
    const onEnded = () => {
      const t = stateRef.current.current
      if (t) {
        const playedMs = (audio.duration ? audio.duration * 1000 : 0) - startedAtRef.current
        if (reportedRef.current !== t.id) {
          reportedRef.current = t.id
          void insertHistory(t.id, Math.round(Math.max(playedMs, 0)), true)
        }
      }
      const { repeat, index, queue } = stateRef.current
      if (repeat === 'one') {
        audio.currentTime = 0
        void audio.play()
      } else {
        const nextIndex = index + 1
        if (nextIndex < queue.length) {
          dispatch({ type: 'SET_QUEUE', queue, index: nextIndex, context: stateRef.current.context })
          const next = queue[nextIndex]
          if (next) void loadAndPlay(next)
        } else if (repeat === 'all' && queue.length > 0) {
          dispatch({ type: 'SET_QUEUE', queue, index: 0, context: stateRef.current.context })
          const next = queue[0]
          if (next) void loadAndPlay(next)
        } else {
          dispatch({ type: 'PAUSE' })
        }
      }
    }
    const onError = () => {
      dispatch({ type: 'LOADING', loading: false })
      dispatch({ type: 'PAUSE' })
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Aplicar volumen / mute al elemento.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = state.volume / 100
    audio.muted = state.muted
  }, [state.volume, state.muted])

  // --- Media Session ----------------------------------------------------------
  const currentTrack = state.current
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    if (!currentTrack) return
    const artistName = formatArtists(currentTrack)
    const albumTitle = currentTrack.album?.title
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: artistName,
      album: albumTitle ?? undefined,
      artwork: currentTrack.cover_url ? [{ src: currentTrack.cover_url, sizes: '512x512' }] : [],
    })

    const setPosition = (ms: number) => {
      const audio = audioRef.current
      if (!audio || !Number.isFinite(audio.duration)) return
      audio.currentTime = ms / 1000
    }

    navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play())
    navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause())
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      const { index, queue } = stateRef.current
      if (index > 0) {
        const i = index - 1
        dispatch({ type: 'SET_QUEUE', queue, index: i, context: stateRef.current.context })
        const next = queue[i]
        if (next) void loadAndPlay(next)
      }
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      const { index, queue } = stateRef.current
      const i = index + 1
      if (i < queue.length) {
        dispatch({ type: 'SET_QUEUE', queue, index: i, context: stateRef.current.context })
        const next = queue[i]
        if (next) void loadAndPlay(next)
      }
    })
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) setPosition(details.seekTime * 1000)
    })
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      const audio = audioRef.current
      if (audio) setPosition(Math.max(0, audio.currentTime - 10) * 1000)
    })
    navigator.mediaSession.setActionHandler('seekforward', () => {
      const audio = audioRef.current
      if (audio) setPosition((audio.currentTime + 10) * 1000)
    })
  }, [currentTrack, loadAndPlay])

  // --- Acciones públicas -------------------------------------------------------
  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (stateRef.current.isPlaying) {
      audio.pause()
    } else if (stateRef.current.current) {
      void audio.play().catch(() => dispatch({ type: 'PAUSE' }))
    }
  }, [])

  const next = useCallback(() => {
    const { index, queue, repeat } = stateRef.current
    let i = index + 1
    if (i >= queue.length) {
      if (repeat === 'all' && queue.length > 0) i = 0
      else return
    }
    dispatch({ type: 'SET_QUEUE', queue, index: i, context: stateRef.current.context })
    const next = queue[i]
    if (next) void loadAndPlay(next)
  }, [loadAndPlay])

  const previous = useCallback(() => {
    const audio = audioRef.current
    const { index, queue } = stateRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    const i = Math.max(0, index - 1)
    dispatch({ type: 'SET_QUEUE', queue, index: i, context: stateRef.current.context })
    const prev = queue[i]
    if (prev) void loadAndPlay(prev)
  }, [loadAndPlay])

  const seekTo = useCallback((ms: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(ms / 1000, audio.duration ?? 0))
    dispatch({ type: 'TIME', positionMs: ms, durationMs: stateRef.current.durationMs })
  }, [])

  const setVolume = useCallback((v: number) => {
    dispatch({ type: 'VOLUME', volume: Math.max(0, Math.min(100, Math.round(v))) })
    if (v > 0) dispatch({ type: 'MUTE', muted: false })
  }, [])

  const toggleMute = useCallback(() => {
    dispatch({ type: 'MUTE', muted: !stateRef.current.muted })
  }, [])

  const toggleShuffle = useCallback(() => {
    const { shuffle, queue, index } = stateRef.current
    const current = queue[index]
    if (!shuffle) {
      // Mezcla conservando la canción actual al principio.
      const rest = queue.filter((_, i) => i !== index)
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[rest[i], rest[j]] = [rest[j], rest[i]]
      }
      const shuffled = current ? [current, ...rest] : rest
      originalOrderRef.current = queue
      dispatch({ type: 'SET_QUEUE', queue: shuffled, index: 0, context: stateRef.current.context })
      dispatch({ type: 'SHUFFLE', shuffle: true })
    } else {
      const original = originalOrderRef.current.length > 0 ? originalOrderRef.current : queue
      const idx = current ? Math.max(0, original.findIndex((t) => t.id === current.id)) : 0
      dispatch({ type: 'SET_QUEUE', queue: original, index: idx, context: stateRef.current.context })
      dispatch({ type: 'SHUFFLE', shuffle: false })
    }
  }, [])

  const cycleRepeat = useCallback(() => {
    const next = REPEAT_ORDER[(REPEAT_ORDER.indexOf(stateRef.current.repeat) + 1) % REPEAT_ORDER.length]
    dispatch({ type: 'REPEAT', repeat: next })
  }, [])

  const addToQueue = useCallback((track: Track) => {
    const { queue, context } = stateRef.current
    dispatch({ type: 'SET_QUEUE', queue: [...queue, track], index: stateRef.current.index, context })
  }, [])

  const playNext = useCallback((track: Track) => {
    const { queue, index, context } = stateRef.current
    const next = [...queue]
    next.splice(index + 1, 0, track)
    dispatch({ type: 'SET_QUEUE', queue: next, index, context })
  }, [])

  const removeFromQueue = useCallback((i: number) => {
    const { queue, index, context } = stateRef.current
    const next = queue.filter((_, idx) => idx !== i)
    const newIndex = i < index ? index - 1 : index
    dispatch({ type: 'SET_QUEUE', queue: next, index: newIndex, context })
  }, [])

  const clearQueue = useCallback(() => {
    dispatch({ type: 'SET_QUEUE', queue: [], index: -1, context: null })
    dispatch({ type: 'PAUSE' })
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
    }
  }, [])

  const reorderQueue = useCallback((from: number, to: number) => {
    const { queue, index, context } = stateRef.current
    const next = [...queue]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    let newIndex = index
    if (from === index) newIndex = to
    else if (from < index && to >= index) newIndex = index - 1
    else if (from > index && to <= index) newIndex = index + 1
    dispatch({ type: 'SET_QUEUE', queue: next, index: newIndex, context })
  }, [])

  const value = useMemo<PlayerContextValue>(
    () => ({
      ...state,
      queueIndex: state.index,
      playTrack,
      playTracks,
      addToQueue,
      playNext,
      removeFromQueue,
      reorderQueue,
      clearQueue,
      togglePlay,
      next,
      previous,
      seekTo,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
    }),
    [
      state,
      playTrack,
      playTracks,
      addToQueue,
      playNext,
      removeFromQueue,
      reorderQueue,
      clearQueue,
      togglePlay,
      next,
      previous,
      seekTo,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
    ]
  )

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="auto" />
    </PlayerContext.Provider>
  )
}

async function insertHistory(trackId: string, durationPlayedMs: number, completed: boolean) {
  try {
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track_id: trackId, duration_played_ms: durationPlayedMs, completed }),
    })
    if (!res.ok) console.error('No se pudo registrar el historial')
  } catch {
    // Silencioso: el historial no debe interrumpir la reproducción.
  }
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer debe usarse dentro de <PlayerProvider>')
  return ctx
}