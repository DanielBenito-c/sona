-- Detección de duplicados en importación: columna normalizada de título.
-- title_norm = título en minúsculas, sin acentos y solo [a-z0-9 ].
-- El JS equivalente vive en src/services/import.ts (normalizeTitle).

alter table public.tracks add column if not exists title_norm text;

create index if not exists tracks_title_norm_idx on public.tracks (title_norm);

update public.tracks
set title_norm = trim(regexp_replace(
  regexp_replace(translate(lower(title), 'áéíóúüñ', 'aeioun'), '[^a-z0-9 ]+', ' ', 'g'),
  '\s+', ' ', 'g'
))
where title_norm is null;