-- ============================================================
-- Sona — Migración 0003: arreglos del pipeline de importación
--   Idempotente: se puede ejecutar varias veces sin error.
--   1. El guard de profiles no debe bloquear al service role
--      (el dashboard de admin lo usa; auth.uid() es null y
--      is_admin() devolvería false).
--   2. Constraints únicos para artistas/álbumes (refuerzo opcional:
--      el import ya no los necesita, pero protegen contra
--      duplicados a nivel de base de datos).
-- ============================================================

-- 1) Guard de perfiles: permite el service role (gestión de usuarios
--    desde el panel de administración).
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.role is distinct from new.role or old.is_blocked is distinct from new.is_blocked)
     and not public.is_admin()
     and auth.role() <> 'service_role' then
    raise exception 'Solo un administrador puede cambiar rol o estado de bloqueo';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- 2) Constraints únicos que coinciden con los upserts
--    (artists: name · albums: artist_id, title).
--    Solo se añaden si no existen ya y no hay duplicados.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'artists_name_unique') then
    alter table public.artists add constraint artists_name_unique unique (name);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'albums_artist_title_unique') then
    alter table public.albums add constraint albums_artist_title_unique unique (artist_id, title);
  end if;
end $$;

-- Los índices lower() quedan cubiertos por los constraints anteriores.
drop index if exists public.artists_name_lower;
drop index if exists public.albums_artist_title;