-- ============================================================
-- Sona — Esquema inicial (0001)
-- Aplicar desde el SQL Editor de Supabase (o `supabase db push`)
-- ============================================================

create extension if not exists pg_trgm;

-- ============================================================
-- USUARIOS
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('admin', 'user')),
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower on public.profiles (lower(username));
create index if not exists profiles_role on public.profiles (role);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  volume integer not null default 80 check (volume between 0 and 100),
  shuffle boolean not null default false,
  repeat_mode text not null default 'off' check (repeat_mode in ('off', 'all', 'one')),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- BIBLIOTECA
-- ============================================================

create table if not exists public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists artists_name_lower on public.artists (lower(name));
create index if not exists artists_name_trgm on public.artists using gin (name gin_trgm_ops);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist_id uuid not null references public.artists (id) on delete cascade,
  release_year smallint check (release_year between 1800 and 2100),
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists albums_artist_title on public.albums (artist_id, lower(title));
create index if not exists albums_title_trgm on public.albums using gin (title gin_trgm_ops);
create index if not exists albums_release_year on public.albums (release_year);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist_id uuid not null references public.artists (id) on delete cascade,
  album_id uuid references public.albums (id) on delete set null,
  genre_id uuid references public.genres (id) on delete set null,
  track_number smallint check (track_number > 0),
  disc_number smallint not null default 1 check (disc_number > 0),
  duration_ms integer not null check (duration_ms > 0),
  audio_path text not null,
  cover_url text,
  lyrics text,
  custom_metadata jsonb not null default '{}'::jsonb,
  plays_count bigint not null default 0,
  added_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tracks_audio_path on public.tracks (audio_path);
create unique index if not exists tracks_album_position on public.tracks (album_id, disc_number, track_number)
  where album_id is not null and track_number is not null;
create index if not exists tracks_artist on public.tracks (artist_id);
create index if not exists tracks_album on public.tracks (album_id);
create index if not exists tracks_genre on public.tracks (genre_id);
create index if not exists tracks_title_trgm on public.tracks using gin (title gin_trgm_ops);
create index if not exists tracks_added_at on public.tracks (added_at desc);
create index if not exists tracks_popular on public.tracks (plays_count desc);

-- ============================================================
-- PLAYLISTS
-- ============================================================

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  cover_url text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists playlists_owner on public.playlists (owner_id);
create index if not exists playlists_name_trgm on public.playlists using gin (name gin_trgm_ops);

create table if not exists public.playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  position integer not null,
  added_by uuid not null references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  constraint playlist_tracks_track_unique unique (playlist_id, track_id),
  constraint playlist_tracks_position_unique unique (playlist_id, position)
    deferrable initially deferred
);

create index if not exists playlist_tracks_playlist on public.playlist_tracks (playlist_id, position);
create index if not exists playlist_tracks_track on public.playlist_tracks (track_id);

-- ============================================================
-- FAVORITOS / FOLLOWS
-- ============================================================

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_type text not null check (item_type in ('track', 'album', 'artist', 'playlist')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  constraint favorites_unique unique (user_id, item_type, item_id)
);

create index if not exists favorites_user on public.favorites (user_id, item_type, created_at desc);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followable_type text not null check (followable_type in ('artist', 'user', 'playlist')),
  followable_id uuid not null,
  created_at timestamptz not null default now(),
  constraint follows_unique unique (follower_id, followable_type, followable_id)
);

create index if not exists follows_user on public.follows (follower_id, followable_type, created_at desc);

-- ============================================================
-- HISTORIAL / RECIENTES / COLA
-- ============================================================

create table if not exists public.listening_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  played_at timestamptz not null default now(),
  duration_played_ms integer not null default 0,
  completed boolean not null default false
);

create index if not exists history_user_time on public.listening_history (user_id, played_at desc);
create index if not exists history_track on public.listening_history (track_id);
create index if not exists history_user_track on public.listening_history (user_id, track_id);

create table if not exists public.recently_played (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_type text not null check (item_type in ('track', 'album', 'artist', 'playlist')),
  item_id uuid not null,
  played_at timestamptz not null default now(),
  constraint recently_played_unique unique (user_id, item_type, item_id)
);

create index if not exists recently_played_user on public.recently_played (user_id, played_at desc);

create table if not exists public.queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  position integer not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint queue_position_unique unique (user_id, position)
);

create index if not exists queue_user on public.queue (user_id, position);

-- ============================================================
-- UPLOADS (pipeline de importación)
-- ============================================================

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  filename text not null,
  size_bytes bigint not null check (size_bytes > 0),
  mime_type text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'error', 'cancelled')),
  error text,
  track_id uuid references public.tracks (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists uploads_user on public.uploads (user_id, created_at desc);
create index if not exists uploads_status on public.uploads (status);

-- ============================================================
-- FUNCIONES AUXILIARES
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not is_blocked
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Primer usuario registrado → admin. El resto → user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  suffix int := 2;
  is_first boolean;
begin
  base := lower(regexp_replace(
    coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'user'),
    '[^a-z0-9]', '', 'g'
  ));
  if base = '' then base := 'user'; end if;
  base := left(base, 20);

  candidate := base;
  while exists (select 1 from public.profiles where lower(username) = candidate) loop
    candidate := base || suffix::text;
    suffix := suffix + 1;
  end loop;

  select not exists (select 1 from public.profiles) into is_first;

  insert into public.profiles (id, username, full_name, role)
  values (
    new.id,
    candidate,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ''),
    case when is_first then 'admin' else 'user' end
  );

  insert into public.user_settings (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impide que un usuario normal se asigne role admin o se desbloquee.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.role is distinct from new.role or old.is_blocked is distinct from new.is_blocked)
     and not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar rol o estado de bloqueo';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger artists_set_updated_at
  before update on public.artists
  for each row execute function public.set_updated_at();

create trigger albums_set_updated_at
  before update on public.albums
  for each row execute function public.set_updated_at();

create trigger tracks_set_updated_at
  before update on public.tracks
  for each row execute function public.set_updated_at();

create trigger playlists_set_updated_at
  before update on public.playlists
  for each row execute function public.set_updated_at();

create trigger uploads_set_updated_at
  before update on public.uploads
  for each row execute function public.set_updated_at();

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Registro de reproducción con dedupe:
--   - ignora la misma canción del mismo usuario en < 60 s
--   - incrementa plays_count de la canción
--   - actualiza recently_played
create or replace function public.handle_history_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.listening_history
    where user_id = new.user_id
      and track_id = new.track_id
      and played_at > now() - interval '60 seconds'
  ) then
    return null;
  end if;

  update public.tracks set plays_count = plays_count + 1 where id = new.track_id;

  insert into public.recently_played (user_id, item_type, item_id, played_at)
  values (new.user_id, 'track', new.track_id, new.played_at)
  on conflict (user_id, item_type, item_id)
  do update set played_at = excluded.played_at;

  return new;
end;
$$;

create trigger on_history_insert
  before insert on public.listening_history
  for each row execute function public.handle_history_insert();

-- Reindexa posiciones de una playlist (tras eliminar/reordenar).
create or replace function public.reindex_playlist(p_playlist uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.playlist_tracks set position = -position - 1000000 where playlist_id = p_playlist;
  update public.playlist_tracks pt
    set position = sub.new_pos
    from (
      select id, row_number() over (order by position desc) as new_pos
      from public.playlist_tracks where playlist_id = p_playlist
    ) sub
    where pt.id = sub.id;
$$;

-- ============================================================
-- RLS
-- ============================================================

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.genres enable row level security;
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.tracks enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.favorites enable row level security;
alter table public.follows enable row level security;
alter table public.listening_history enable row level security;
alter table public.recently_played enable row level security;
alter table public.queue enable row level security;
alter table public.uploads enable row level security;

-- Solo admin puede tocar role/is_blocked (aunque sea su propia fila).
revoke update (role) on public.profiles from anon, authenticated;
revoke update (is_blocked) on public.profiles from anon, authenticated;

-- profiles
create policy profiles_select on public.profiles
  for select to authenticated using (true);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- user_settings
create policy settings_select_own on public.user_settings
  for select to authenticated using (user_id = auth.uid());

create policy settings_update_own on public.user_settings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Biblioteca (lectura para todos los autenticados, escritura solo admin)
create policy genres_select on public.genres for select to authenticated using (true);
create policy genres_admin on public.genres for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy artists_select on public.artists for select to authenticated using (true);
create policy artists_admin on public.artists for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy albums_select on public.albums for select to authenticated using (true);
create policy albums_admin on public.albums for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy tracks_select on public.tracks for select to authenticated using (true);
create policy tracks_admin on public.tracks for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- playlists (propias o públicas; admin todo)
create policy playlists_select on public.playlists
  for select to authenticated
  using (owner_id = auth.uid() or is_public or public.is_admin());

create policy playlists_insert_own on public.playlists
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy playlists_update_own on public.playlists
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy playlists_update_admin on public.playlists
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy playlists_delete_own on public.playlists
  for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- playlist_tracks (via la playlist)
create policy pt_select on public.playlist_tracks
  for select to authenticated
  using (exists (
    select 1 from public.playlists p
    where p.id = playlist_id and (p.owner_id = auth.uid() or p.is_public or public.is_admin())
  ));

create policy pt_insert on public.playlist_tracks
  for insert to authenticated
  with check (exists (
    select 1 from public.playlists p
    where p.id = playlist_id and (p.owner_id = auth.uid() or public.is_admin())
  ));

create policy pt_update on public.playlist_tracks
  for update to authenticated
  using (exists (
    select 1 from public.playlists p
    where p.id = playlist_id and (p.owner_id = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.playlists p
    where p.id = playlist_id and (p.owner_id = auth.uid() or public.is_admin())
  ));

create policy pt_delete on public.playlist_tracks
  for delete to authenticated
  using (exists (
    select 1 from public.playlists p
    where p.id = playlist_id and (p.owner_id = auth.uid() or public.is_admin())
  ));

-- favorites / follows (propias)
create policy favorites_select on public.favorites for select to authenticated using (user_id = auth.uid());
create policy favorites_insert on public.favorites for insert to authenticated with check (user_id = auth.uid());
create policy favorites_delete on public.favorites for delete to authenticated using (user_id = auth.uid());

create policy follows_select on public.follows for select to authenticated using (follower_id = auth.uid());
create policy follows_insert on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy follows_delete on public.follows for delete to authenticated using (follower_id = auth.uid());

-- historial / recientes / cola (propias)
create policy history_select on public.listening_history for select to authenticated using (user_id = auth.uid());
create policy history_insert on public.listening_history for insert to authenticated with check (user_id = auth.uid());
create policy history_delete on public.listening_history for delete to authenticated using (user_id = auth.uid());

create policy recent_select on public.recently_played for select to authenticated using (user_id = auth.uid());
create policy recent_insert on public.recently_played for insert to authenticated with check (user_id = auth.uid());
create policy recent_update on public.recently_played for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy recent_delete on public.recently_played for delete to authenticated using (user_id = auth.uid());

create policy queue_select on public.queue for select to authenticated using (user_id = auth.uid());
create policy queue_insert on public.queue for insert to authenticated with check (user_id = auth.uid());
create policy queue_update on public.queue for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy queue_delete on public.queue for delete to authenticated using (user_id = auth.uid());

-- uploads (solo admin)
create policy uploads_admin on public.uploads for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- STORAGE
--   audio  → bucket privado (URLs firmadas)
--   covers → bucket público (portadas/avatares, cacheable)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('audio', 'audio', false, 104857600,
   array['audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/x-flac', 'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/ogg', 'application/ogg', 'audio/x-m4a']),
  ('covers', 'covers', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy covers_public_read on storage.objects
  for select using (bucket_id = 'covers');

create policy audio_auth_read on storage.objects
  for select using (
    bucket_id = 'audio'
    and exists (select 1 from auth.users u where u.id = auth.uid())
  );

-- ============================================================
-- NOTA: los índices trigram requieren pg_trgm (creado arriba).
-- Para búsquedas a 100k+ canciones, las queries deben usar
-- pg_trgm (ILIKE '%x%' usa el índice GIN).
-- ============================================================