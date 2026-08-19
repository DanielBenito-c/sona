-- ============================================================
-- Sona — Migración 0002: subida de música
-- Índice de duplicados por hash SHA-256 + políticas de storage
-- ============================================================

-- Índice único sobre el sha256 del fichero (en custom_metadata).
-- Garantiza a nivel de base de datos que un mismo fichero no se
-- importa dos veces.
create unique index if not exists tracks_sha256
  on public.tracks ((custom_metadata ->> 'file_sha256'))
  where custom_metadata ? 'file_sha256';

-- Políticas de storage para que SOLO administradores puedan
-- subir/borrar objetos en el bucket de audio desde el cliente.
-- (El insert del cliente hace POST /storage/v1/object/audio/...)
create policy audio_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'audio' and public.is_admin());

create policy audio_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'audio' and public.is_admin());

-- Los admin también pueden listar el bucket (para futuros imports masivos).
create policy audio_admin_list on storage.objects
  for select to authenticated
  using (bucket_id = 'audio' and public.is_admin());