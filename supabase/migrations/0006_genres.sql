-- Géneros de la biblioteca (asignación automática por artista).
insert into public.genres (name) values
  ('Rock & Indie'),
  ('Dance & Electrónica'),
  ('Pop'),
  ('Hip-Hop & Rap'),
  ('Pop latino'),
  ('R&B'),
  ('Reggaetón & Urbano') on conflict (name) do nothing;

-- Asigna género a cada canción según su título.
update public.tracks t set genre_id = g.id,
  search_text = lower(concat_ws(' ', t.title, a.name, al.title, g.name))
from public.genres g
left join public.artists a on a.id = t.artist_id
left join public.albums al on al.id = t.album_id
where t.genre_id is null and (
  (g.name = 'Rock & Indie' and lower(t.title) in ('washing machine heart')) or
  (g.name = 'Dance & Electrónica' and lower(t.title) in ('i''m so lucky! - hardstyle', 'all the things she said - nightcore - slowed', 'under your spell', 'sun is up', 'bailando', 'break your heart', 'boom boom pow', 'don’t stop the party', 'the time (dirty bit)', 'everytime we touch', 'we found love', 'bimbo doll', 'the days - notion remix', 'stereo love - scotty edit mix', 'my first kiss (feat. ke$ha)', 'like a g6', 'dj got us fallin'' in love (feat. pitbull)', 'more than friends')) or
  (g.name = 'Pop' and lower(t.title) in ('party in the u.s.a.', 'lovegame', 'hollaback girl', 'pon de replay', 'die young', 'hurricane', 'gimme more', 'love me', 'sexyback (feat. timbaland)', 'if u seek amy', 'i kissed a girl', 'sos', 'oops!...i did it again', 'firework', 'girls just want to have fun', 'it''s raining men', 'poker face', 'call me maybe', 'i wanna dance with somebody (who loves me)', 'so what', 'wannabe', 'fire burning', 'we can''t stop', 'get the party started', 'paparazzi', 's&m', 'tik tok', 'don''t cha', 'cheap thrills (feat. sean paul)', '4 minutes (feat. justin timberlake & timbaland)', 'a little party never killed nobody (all we got)', 'dancing queen - from ''mamma mia!'' original motion picture soundtrack', 'down', 'gimme! gimme! gimme! (a man after midnight) - from ''mamma mia!'' original motion picture soundtrack', 'umbrella - radio edit', 'moves like jagger - studio recording from "the voice" performance')) or
  (g.name = 'Hip-Hop & Rap' and lower(t.title) in ('jump', 'va va voom', 'run this town', 'starships', 'club can''t handle me (feat. david guetta)', 'best friend (feat. doja cat)', 'dangerous', 'fancy', 'low (feat. t-pain)')) or
  (g.name = 'Pop latino' and lower(t.title) in ('ain''t your mama', 'feel this moment (feat. christina aguilera)', 'i know you want me (calle ocho)', 'let''s get loud', 'hips don''t lie (feat. wyclef jean)', 'can''t remember to forget you (feat. rihanna)', 'timber', 'rain over me (feat. marc anthony)', 'don''t stop the party (feat. tjr)', 'on the floor - radio edit')) or
  (g.name = 'R&B' and lower(t.title) in ('milkshake', 'single ladies (put a ring on it)', 'yeah! (feat. lil jon & ludacris)')) or
  (g.name = 'Reggaetón & Urbano' and lower(t.title) in ('get busy', 'temperature', 'narcotics (with bryant myers)', 'dame la verde', 'tu$$i (with dei v)'))
);
