# Sona — Plataforma privada de streaming musical

Plataforma web de música para un grupo privado (familia/amigos), similar en **funcionalidades** a los grandes servicios de streaming, pero con identidad visual y arquitectura propias. Optimizada para iPhone/iOS y preparada para bibliotecas de ~100.000 canciones.

---

## 1. Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js (App Router) + React |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS |
| Backend como servicio | Supabase (PostgreSQL + Auth + Storage) |
| Almacenamiento de objetos | Supabase Storage (abstraído tras interfaz `StorageProvider`, migrable a R2/S3) |
| Deployment | Vercel |
| Audio | HTML5 Audio API + Media Session API |
| Iconos | Lucide React |
| PWA | Manifest + Service Worker (reproducción en background limitada por iOS: ver §12) |

---

## 2. Análisis de requisitos (resumen)

1. **Usuarios/Auth**: registro, login, logout, recuperación y cambio de contraseña, perfil (avatar, username, email), roles `admin`/`user`, bloqueo de usuarios.
2. **Biblioteca**: tracks, álbumes, artistas, géneros, año, nº pista, disc, duración, portada, letra, fecha incorporación, metadatos custom, bien normalizada.
3. **Reproductor global persistente**: play/pause/prev/next, seek, progreso, volumen, mute, shuffle, repeat, repeat-one, cola (añadir, reproducir después, reordenar, vaciar), Media Session, optimizado para iPhone.
4. **Playlists**: CRUD completo, reordenar, compartir, duplicar + playlists automáticas (favoritos, recientes, añadido recientemente, más reproducido).
5. **Favoritos**: tracks, álbumes, artistas, playlists.
6. **Búsqueda** instantánea con debounce, resultados agrupados.
7. **Home** personalizado, **artistas**, **álbumes**, **historial + estadísticas**, **recomendaciones** simples, **descubrimiento**.
8. **Subida** (solo admin): individual/múltiple, drag & drop, progreso, cancelar, duplicados, extracción de metadatos (MP3/FLAC/M4A/OGG).
9. **Admin** `/admin`: dashboard + gestión biblioteca + gestión usuarios.
10. **Diseño**: dark-first, mobile-first, safe areas iOS, bottom nav, reproductor compacto/expandido.
11. **PWA**, **rendimiento** (paginación, virtualización, índices), **seguridad** (RLS, validación, rate limiting, URLs firmadas).

---

## 3. Arquitectura

```
┌─────────────────────────── Next.js App Router ───────────────────────────┐
│                                                                          │
│  app/ (rutas, layouts, pages, server components)                        │
│   │                                                                     │
│   ├─ lib/supabase/server.ts   → acceso a datos (Server Components/Route Handlers)│
│   ├─ services/               → lógica de dominio (biblioteca, historial, admin…)  │
│   ├─ lib/storage/            → StorageProvider (SupabaseStorage, futuro R2Storage) │
│   ├─ hooks + contexts/       → usePlayer, PlayerProvider, AuthProvider (cliente)  │
│   └─ components/             → UI pura y presentacional                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Decisiones arquitectónicas clave (y por qué)

- **App Router con Server Components**: las consultas a Supabase con RLS se hacen desde el servidor (el RLS protege los datos con la sesión del usuario; nunca usamos `service_role` en el cliente). Los componentes de cliente solo llaman a Route Handlers para acciones (play, favorito, etc.).
- **`@supabase/ssr`** (paquetes oficiales actuales) para gestión de sesión con cookies en middleware; patrón recomendado por Supabase para Next.js.
- **Reproductor en un Provider global** (`PlayerProvider`) montado en el layout principal: el `<audio>` vive una sola vez y persiste entre navegaciones. El estado del reproductor es *client-side* (Zustand-lite con `useSyncExternalStore` o estado React simple) y la cola se persiste opcionalmente en `queue` (tabla).
- **Abstracción de almacenamiento** (`StorageProvider`): interfaz `upload/delete/getSignedUrl/getMetadata` + fábrica. La app nunca importa "supabase storage" directamente; cambiar a R2/S3 es implementar otra clase.
- **URLs firmadas**: los ficheros de audio viven en un bucket privado; el cliente obtiene URLs firmadas (temporales) mediante Route Handler. Las portadas viven en bucket público (cacheables por CDN).
- **Historial con dedupe**: una reproducción se contabiliza con reglas (≥30 s reproducidos o ≥60 % de la canción) y no se registra si ya existe un registro de la misma canción en los últimos 60 s. La deduplicación se refuerza con un trigger en PostgreSQL.

---

## 4. Esquema PostgreSQL

El SQL completo está en `supabase/migrations/0001_init.sql`. Resumen de entidades:

```
auth.users (Supabase)
  ├─ profiles              (1:1, roles, bloqueo, avatar, username)
  ├─ user_settings         (1:1)
  ├─ uploads               (admin, pipeline de importación)
  ├─ favorites             (item_type: track|album|artist|playlist)
  ├─ follows               (item_type: artist|user|playlist)
  ├─ listening_history     (registro de reproducciones, dedupe vía trigger)
  ├─ recently_played       (upsert de últimos items)
  └─ queue                 (cola persistida del reproductor)

catalog (biblioteca):
  ├─ genres
  ├─ artists
  ├─ albums (→ artists)
  ├─ tracks (→ albums, artists, genres, plays_count denormalizado)
  ├─ playlists (→ profiles)
  └─ playlist_tracks (→ playlists, tracks, posición)
```

### Índices para 100.000 canciones

- `tracks`: `(album_id)`, `(artist_id)`, `(genre_id)`, `(title)` + **GIN trigram** `(title)` para búsqueda, `(plays_count DESC)`, `(created_at DESC)`.
- `artists.name`, `albums.title`, `playlists.name`: GIN trigram.
- `listening_history`: `(user_id, played_at DESC)`, `(track_id)`, `(user_id, track_id)` para dedupe.
- `favorites`: `(user_id, item_type, item_id)` unique.
- `playlist_tracks`: unique `(playlist_id, position)`, unique `(playlist_id, track_id)`.

### RLS (Row Level Security) — resumen

| Tabla | Lectura | Escritura |
|---|---|---|
| profiles | todos los autenticados | propietario; admin todo |
| genres/artists/albums/tracks | todos los autenticados | solo admin |
| playlists | propietario + públicas | propietario (admin todo) |
| playlist_tracks | vía playlist | propietario de la playlist |
| favorites/follows/history/recently_played/user_settings/queue | propio | propio |
| uploads | admin | admin |

**Regla de oro**: `service_role`/server keys solo existen en el servidor (env privado). El cliente usa `anon` + RLS.

---

## 5. Estructura de carpetas

```
sona/
├─ supabase/migrations/       # SQL versionado (0001_init.sql, …)
├─ public/                    # iconos PWA, manifest
├─ src/
│  ├─ middleware.ts           # refresh de sesión
│  ├─ app/
│  │  ├─ (auth)/              # login, register, forgot, reset
│  │  ├─ (main)/              # layout con sidebar/bottom-nav/player
│  │  │  ├─ home/  search/  discover/  library/  stats/
│  │  │  ├─ album/[id]/  artist/[id]/  playlist/[id]/
│  │  │  ├─ profile/  settings/  queue/
│  │  │  └─ admin/            # dashboard, library, users
│  │  ├─ api/                 # Route Handlers (signed-url, history, admin, …)
│  │  ├─ callback/            # OAuth/email confirmation
│  │  └─ globals.css
│  ├─ components/
│  │  ├─ ui/                  # Button, Input, Dialog, Slider, …
│  │  ├─ layout/              # Sidebar, TopBar, BottomNav, MobilePlayerBar
│  │  ├─ player/              # PlayerBar, ProgressBar, VolumeControl, QueueSheet
│  │  ├─ library/             # TrackRow, AlbumCard, ArtistCard, PlaylistCard, VirtualTrackList
│  │  └─ admin/
│  ├─ contexts/               # PlayerProvider, QueueProvider
│  ├─ hooks/                  # usePlayer, useQueue, useDebounce, useInfiniteTracks, useMediaSession, useSafeArea
│  ├─ lib/
│  │  ├─ supabase/            # client.ts, server.ts, middleware.ts (browser/SSR)
│  │  ├─ storage/             # types.ts, supabase-storage.ts, index.ts
│  │  └─ utils.ts             # formatters, cn
│  ├─ services/               # auth.ts, library.ts, playlists.ts, history.ts, admin.ts, search.ts
│  └─ types/                  # database.ts (generated), music.ts, user.ts, player.ts
├─ .env.local.example
└─ INSTRUCTIONS.md
```

---

## 6. Interfaces TypeScript principales

```ts
type Role = 'admin' | 'user';
interface Profile { id: string; username: string; full_name?: string; avatar_url?: string; role: Role; is_blocked: boolean; created_at: string; }

interface Artist { id: string; name: string; image_url?: string; bio?: string; created_at: string; }
interface Genre  { id: string; name: string; }

interface Album {
  id: string; title: string; artist_id: string;
  release_year?: number; cover_url?: string;
  // cargas útiles con relaciones (Supabase join)
  artist?: Artist; tracks?: Track[]; genres?: Genre[];
  total_duration_ms?: number;
}

interface Track {
  id: string; title: string;
  album_id?: string | null; artist_id: string; genre_id?: string | null;
  track_number?: number; disc_number?: number;
  duration_ms: number; audio_path: string; cover_url?: string | null;
  lyrics?: string | null; custom_metadata?: Record<string, unknown>;
  plays_count: number; added_at: string;
  artist?: Artist; album?: Album; genre?: Genre;
  is_favorite?: boolean; // presente en queries del cliente
}

interface Playlist { id: string; owner_id: string; name: string; description?: string; cover_url?: string; is_public: boolean; created_at: string; owner?: Profile; tracks?: PlaylistTrack[]; }
interface PlaylistTrack { id: string; playlist_id: string; track_id: string; position: number; added_at: string; track?: Track; }

type FavoriteItemType = 'track' | 'album' | 'artist' | 'playlist';
interface Favorite { id: string; user_id: string; item_type: FavoriteItemType; item_id: string; created_at: string; }

type RepeatMode = 'off' | 'all' | 'one';
interface PlayerState { currentTrack?: Track; queue: Track[]; queueIndex: number; isPlaying: boolean; shuffle: boolean; repeat: RepeatMode; volume: number; muted: boolean; }
```

---

## 7. Problemas de escalabilidad (100.000 canciones) y soluciones

1. **Nunca cargar todo el catálogo en cliente** → paginación *keyset* (`WHERE added_at < ? ORDER BY added_at DESC LIMIT 50`) en lugar de offset profundo; infinite scroll con cursor.
2. **Búsqueda lenta** → índices GIN `pg_trgm`; sin `ILIKE '%…%'` sin índice.
3. **N+1** → usar joins de Supabase (`select=*,album:album_id(*)`), batching, y nunca consultar tracks dentro de un bucle.
4. **Listas enormes en UI** → virtualización (`@tanstack/react-virtual`) para la biblioteca y cola.
5. **Imágenes** → bucket público + `next/image` (lazy, blur placeholder) + cache CDN.
6. **URLs firmadas** → cachear en cliente durante su validez (~1 h en Supabase) para no regenerarlas en cada render; el `audio.src` se asigna solo al reproducir.
7. **Historial masivo** → dedupe en trigger; `recently_played` como upsert; contadores `plays_count` denormalizados en `tracks` (actualizados por trigger) para "más reproducido" sin agregaciones pesadas.
8. **Cola** → cap en tabla `queue` (máx. 500), única fila por usuario+posición.
9. **Uploads masivos** → pipeline `uploads` (tabla) con estados `pending/processing/done/error`, diseñado para que luego un worker (Edge Function) procese decenas de miles de ficheros.

---

## 8. Plan por fases (cada fase queda funcional antes de continuar)

- [x] **Fase 0 — Fundación**: documentación, scaffold Next.js, esquema SQL, tipos, estructura.
- [x] **Fase 1 — Auth + layout**: registro/login/logout, recuperación, perfil (avatar, username, email), roles, RLS operativa, sidebar/bottom-nav/player placeholder, PWA manifest + iconos base.
- [ ] **Fase 2 — Biblioteca**: home, álbumes, artistas, búsqueda con debounce, paginación.
- [ ] **Fase 3 — Reproductor**: PlayerProvider, cola, Media Session, persistencia de cola.
- [ ] **Fase 4 — Playlists + favoritos**: CRUD, compartir, duplicar, playlists automáticas.
- [ ] **Fase 5 — Historial + estadísticas**: registro con dedupe, página de estadísticas.
- [ ] **Fase 6 — Admin + subida**: `/admin`, dashboard, gestión usuarios/biblioteca, upload con metadatos.
- [ ] **Fase 7 — Descubrimiento + recomendaciones**: página discover, recomendaciones por metadatos/historial.
- [ ] **Fase 8 — PWA + pulido**: manifest, service worker, safe areas, rendimiento, accesibilidad.

---

## 9. Seguridad

- RLS en todas las tablas (nunca `service_role` en el cliente; solo en Route Handlers del servidor si hace falta, y preferiblemente con checks de rol admin).
- Variables: `NEXT_PUBLIC_*` solo públicas; `SUPABASE_SERVICE_ROLE_KEY` exclusivamente servidor, jamás expuesta.
- Validación de inputs en servidor (zod en Route Handlers); tipos MIME y límites de tamaño en uploads (verificar tanto en cliente como en servidor).
- Rate limiting básico en endpoints sensibles (login/register) — Supabase ya limita auth; documentar límites en uploads.
- URLs firmadas temporales para audio; bucket privado.

---

## 10. Diseño / identidad

- Nombre: **Sona**. Identidad propia: tema oscuro con acento degradado violeta→fucsia, tipografía limpia, bordes suaves.
- Desktop: sidebar izquierdo (nav) + contenido + player inferior fijo.
- Mobile (iPhone): bottom navigation, mini-player sobre la bottom nav, player expandible a pantalla completa con gestos; respeta `env(safe-area-inset-*)` (notch/Dynamic Island) mediante utilidades CSS.
- PWA standalone; tema oscuro en manifest.

---

## 11. PWA

- `manifest.webmanifest` con `display: standalone`, `theme_color` oscuro, iconos 192/512 (incluye máscara).
- Service worker registrado (workbox/`next-pwa` o custom) para shell offline mínimo.
- **Limitaciones iOS conocidas (documentadas)**: reproducción en background solo si el usuario pulsa play desde controles reales del dispositivo (Media Session / pantalla bloqueada); el audio se pausa si el usuario inicia la reproducción sin interacción directa o tras silenciar el iPhone; se maneja con `navigator.mediaSession` y propagación de `ended`/`pause` del sistema.
- `audio.play()` siempre dentro de gestos de usuario.

---

## 12. Configuración de entorno

```
# .env.local (privado, nunca commitear)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # solo servidor
NEXT_PUBLIC_INVITE_CODE=            # opcional: código de invitación para registro

# Al migrar a R2/S3:
# R2_ACCOUNT_ID= R2_ACCESS_KEY_ID= R2_SECRET_ACCESS_KEY= R2_BUCKET=
```

---

## 13. Comandos

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

Migrations: se aplican desde el SQL Editor de Supabase (o `supabase db push` si se usa CLI).