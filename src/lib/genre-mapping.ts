// Mapeo artista → género para asignación automática cuando el fichero de
// audio no trae etiqueta de género. Fuente única: la usa import.ts (al
// importar) y scripts/assign-genres.mjs (para migrar la biblioteca).
// Mantener sin imports para poder ejecutarse con node directamente.

export const ARTIST_GENRE: Record<string, string> = {
  // Pop
  madonna: 'Pop',
  fergie: 'Pop',
  'carly rae jepsen': 'Pop',
  'katy perry': 'Pop',
  'britney spears': 'Pop',
  'miley cyrus': 'Pop',
  'p!nk': 'Pop',
  kesha: 'Pop',
  'justin bieber': 'Pop',
  'lady gaga': 'Pop',
  'maroon 5': 'Pop',
  'meryl streep': 'Pop',
  'amanda seyfried': 'Pop',
  sia: 'Pop',
  'gwen stefani': 'Pop',
  'bridgit mendler': 'Pop',
  'justin timberlake': 'Pop',
  'the pussycat dolls': 'Pop',
  rihanna: 'Pop',
  'cyndi lauper': 'Pop',
  'whitney houston': 'Pop',
  'spice girls': 'Pop',
  'geri halliwell': 'Pop',
  'sean kingston': 'Pop',
  'jay sean': 'Pop',

  // Pop latino
  'jennifer lopez': 'Pop latino',
  shakira: 'Pop latino',
  pitbull: 'Pop latino',

  // Dance & Electrónica
  velours: 'Dance & Electrónica',
  loona: 'Dance & Electrónica',
  'tila tsoli': 'Dance & Electrónica',
  'black eyed peas': 'Dance & Electrónica',
  'taio cruz': 'Dance & Electrónica',
  '3oh!3': 'Dance & Electrónica',
  'edward maya': 'Dance & Electrónica',
  inna: 'Dance & Electrónica',
  cascada: 'Dance & Electrónica',
  'lucky twice': 'Dance & Electrónica',
  'far east movement': 'Dance & Electrónica',
  chrystal: 'Dance & Electrónica',
  'snow strippers': 'Dance & Electrónica',

  // Hip-Hop & Rap
  saweetie: 'Hip-Hop & Rap',
  'iggy azalea': 'Hip-Hop & Rap',
  'nicki minaj': 'Hip-Hop & Rap',
  'kris kross': 'Hip-Hop & Rap',
  'kardinal offishall': 'Hip-Hop & Rap',
  'jay-z': 'Hip-Hop & Rap',
  'flo rida': 'Hip-Hop & Rap',

  // R&B
  beyonce: 'R&B',
  usher: 'R&B',
  kelis: 'R&B',

  // Reggaetón & Urbano
  'luar la l': 'Reggaetón & Urbano',
  'dei v': 'Reggaetón & Urbano',
  yovngchimi: 'Reggaetón & Urbano',
  'sean paul': 'Reggaetón & Urbano',

  // Rock & Indie
  mitski: 'Rock & Indie',
}

// Excepciones por título (subcadena del título normalizado). Prioridad:
// etiqueta del archivo > título > artista.
export const TITLE_OVERRIDES: { match: string; genre: string }[] = [
  { match: 'we found love', genre: 'Dance & Electrónica' }, // Rihanna/Calvin Harris (etiqueta rara)
  { match: 'dj got us fallin', genre: 'Dance & Electrónica' }, // Usher feat. Pitbull
]

export function normalizeGenreName(s: string): string {
  return (s ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export interface GenreTrackInfo {
  title: string
  artistName: string
  /** Género leído de la etiqueta del archivo (tiene prioridad). */
  tagGenre?: string | null
}

/** Resuelve el género de una canción: etiqueta > título > artista. */
export function genreForTrack({ title, artistName, tagGenre }: GenreTrackInfo): string | null {
  const tag = tagGenre?.trim()
  if (tag) return tag
  const normTitle = normalizeGenreName(title)
  for (const { match, genre } of TITLE_OVERRIDES) {
    if (normTitle.includes(match)) return genre
  }
  return ARTIST_GENRE[normalizeGenreName(artistName)] ?? null
}