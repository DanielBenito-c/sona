-- 0005: artistas múltiples por canción.
-- Una canción puede tener varios artistas ("Flo Rida, T-pain"): se crea una
-- tabla intermedia track_artists, se rellena con los artistas ya existentes
-- y se dividen los nombres compuestos ya importados.

create table if not exists public.track_artists (
  track_id uuid not null references public.tracks (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  position integer not null default 1,
  primary key (track_id, artist_id)
);

create index if not exists track_artists_artist on public.track_artists (artist_id, position);
create index if not exists track_artists_track on public.track_artists (track_id, position);

alter table public.track_artists enable row level security;

create policy track_artists_select on public.track_artists
  for select to authenticated using (true);
create policy track_artists_admin on public.track_artists
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Backfill: enlaza cada canción con su artista principal.
insert into public.track_artists (track_id, artist_id, position)
select t.id, t.artist_id, 1
from public.tracks t
where t.artist_id is not null
on conflict (track_id, artist_id) do nothing;

-- Divide los nombres de artista compuestos ya importados.
-- Separadores conservadores: coma, &, feat./ft./featuring, with, " y ".
-- Se evitan "/" y "+" para no romper bandas tipo "AC/DC".
do $$
declare
  r record;
  cleaned text;
  parts text[];
  part text;
  aid uuid;
  pos int;
begin
  for r in
    select t.id as track_id, t.artist_id, a.name as artist_name
    from public.tracks t
    join public.artists a on a.id = t.artist_id
    where a.name ~ '(,|&|feat|ft\.|with| y )'
  loop
    cleaned := regexp_replace(
      r.artist_name,
      '\((?:feat\.?|ft\.?|featuring|with)\s*:?\s*([^)]+)\)',
      ', \1',
      'gi'
    );
    parts := regexp_split_to_array(
      cleaned,
      '\s*(?:,|&|\bfeaturing\b|\bfeat\.?|\bft\.?|\bwith\b|\by\b)\s*'
    );
    if array_length(parts, 1) > 1 then
      pos := 1;
      foreach part in array parts
      loop
        part := btrim(part);
        continue when part = '' or lower(part) in ('unknown', 'desconocido');
        select id into aid from public.artists where lower(name) = lower(part) limit 1;
        if aid is null then
          insert into public.artists (name) values (part) returning id into aid;
        end if;
        if pos = 1 and r.artist_id <> aid then
          update public.tracks set artist_id = aid where id = r.track_id;
        end if;
        insert into public.track_artists (track_id, artist_id, position)
        values (r.track_id, aid, pos)
        on conflict (track_id, artist_id) do nothing;
        pos := pos + 1;
      end loop;
    end if;
  end loop;
end $$;

-- Elimina los enlaces sobrantes a artistas compuestos que quedaron tras el
-- backfill (el backfill insertó el nombre compuesto en posición 1 y el split
-- añadió los divididos; había que quitar el compuesto).
delete from public.track_artists ta
using public.artists a
where ta.artist_id = a.id
  and a.name ~ '(,|&|feat|ft\.|with| y )';

-- Apunta los álbumes de artistas compuestos al primer artista dividido.
do $$
declare
  r record;
  cleaned text;
  parts text[];
  part text;
  aid uuid;
begin
  for r in
    select al.id as album_id, a.name as artist_name
    from public.albums al
    join public.artists a on a.id = al.artist_id
    where a.name ~ '(,|&|feat|ft\.|with| y )'
  loop
    cleaned := regexp_replace(
      r.artist_name,
      '\((?:feat\.?|ft\.?|featuring|with)\s*:?\s*([^)]+)\)',
      ', \1',
      'gi'
    );
    parts := regexp_split_to_array(
      cleaned,
      '\s*(?:,|&|\bfeaturing\b|\bfeat\.?|\bft\.?|\bwith\b|\by\b)\s*'
    );
    foreach part in array parts
    loop
      part := btrim(part);
      continue when part = '' or lower(part) in ('unknown', 'desconocido');
      select id into aid from public.artists where lower(name) = lower(part) limit 1;
      exit when aid is null;
      update public.albums set artist_id = aid where id = r.album_id;
      exit;
    end loop;
  end loop;
end $$;

-- Elimina los artistas huérfanos con nombre compuesto que quedaron vacíos.
delete from public.artists a
where a.name ~ '(,|&|feat|ft\.|with| y )'
  and not exists (select 1 from public.tracks t where t.artist_id = a.id)
  and not exists (select 1 from public.albums al where al.artist_id = a.id)
  and not exists (select 1 from public.track_artists ta where ta.artist_id = a.id);

-- Reindexa la búsqueda con los nuevos nombres de artistas.
update public.tracks t
set search_text = (
  select lower(concat_ws(' ', t.title, string_agg(a.name, ' ')))
  from track_artists ta
  join artists a on a.id = ta.artist_id
  where ta.track_id = t.id
  group by t.id
);