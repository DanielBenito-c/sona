-- 0004: búsqueda denormalizada de tracks.
-- PostgREST no permite rutas embebidas (artist_id.name) dentro de or=(...),
-- así que se busca sobre una columna search_text única. Se rellena en el
-- import y se rellena aquí para los tracks ya existentes.

ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS search_text text;

UPDATE public.tracks t
SET search_text = lower(
  coalesce(t.title, '')
  || ' ' || coalesce((SELECT a.name FROM public.artists a WHERE a.id = t.artist_id), '')
  || ' ' || coalesce((SELECT al.title FROM public.albums al WHERE al.id = t.album_id), '')
);

CREATE INDEX IF NOT EXISTS idx_tracks_search_text ON public.tracks (search_text);