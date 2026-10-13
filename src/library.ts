import { ICONS } from './data/icons'
import {
  DEFAULT_GRADIENT,
  DEFAULT_LABEL,
  DEFAULT_HIGHLIGHT,
  DEFAULT_METRICS,
  appearance,
  darkAppearance,
  type Appearance,
  type Artwork,
  type IconDef,
  type Label,
} from './model'
import { parseArtwork, serializeSvg } from './svg'

/** What one icon looks like on disk: everything but the artwork, which lives in a file. */
export type IconRecord = Omit<IconDef, 'artwork'> & { artworkFile?: string }

export type StoredCatalogue = { version: number; icons: IconRecord[]; group: unknown }

export type LibraryPayload = { catalogue: StoredCatalogue | null; files: Record<string, string> }

/** Where a deployed app keeps the set: the folder is only there when a server serves it. */
const STORAGE_KEY = 'super-icon-studio:library'

function storedLibrary(): LibraryPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LibraryPayload) : null
  } catch {
    return null
  }
}

export async function readLibrary(): Promise<LibraryPayload | null> {
  try {
    const response = await fetch('/api/library')
    if (response.ok) return (await response.json()) as LibraryPayload
  } catch {
    // No middleware to ask; the browser is the store instead.
  }
  const stored = storedLibrary()
  if (stored) return stored
  try {
    // First visit to a build: it carries the folder as it was at build time.
    const response = await fetch('/icons.json')
    return response.ok ? ((await response.json()) as LibraryPayload) : null
  } catch {
    // Nothing to read: the app runs from the bundled catalogue instead.
    return null
  }
}

/** Rebuilds the icons from what the folder holds. Files win over the stored catalogue, and
 *  an .svg nobody claims becomes a new icon. */
export function hydrate(payload: LibraryPayload): IconDef[] {
  const records: IconRecord[] = payload.catalogue?.icons?.length ? payload.catalogue.icons : ICONS
  const claimed = new Set<string>()

  const icons = records.map((record) => {
    const { artworkFile, ...rest } = record
    const normalised = {
      ...rest,
      metrics: { ...DEFAULT_METRICS, ...rest.metrics },
      light: normaliseAppearance(rest.light),
      dark: normaliseAppearance(rest.dark),
    } as IconDef
    const source = artworkFile ? payload.files[artworkFile] : undefined
    if (!source) return normalised
    claimed.add(artworkFile as string)
    // Already trimmed on the way in, so it is only read back here.
    const artwork = parseArtwork(source, artworkFile as string, { trim: false })
    return { ...normalised, artwork: artwork ?? undefined }
  })

  for (const [file, source] of Object.entries(payload.files)) {
    if (claimed.has(file)) continue
    const artwork = parseArtwork(source, file, { trim: true })
    if (!artwork) continue
    icons.push(iconFromFile(file, artwork))
  }

  return icons
}

/** Fills in fields a catalogue written by an older build would not have. */
function normaliseAppearance(value: (Partial<Appearance> & { label?: Omit<Label, 'id'> }) | undefined): Appearance {
  // An older build wrote one label outside the list; it comes back as the first component.
  const { label: written, ...rest } = value ?? {}
  const components: Partial<Label>[] = rest.labels ?? (written ? [written] : [])

  return {
    ...appearance('#000000'),
    ...rest,
    labels: components.map((component, index) => ({
      ...DEFAULT_LABEL,
      ...component,
      id: component.id ?? `label-${index + 1}`,
    })),
    background: rest.background ?? 'Plain',
    glyphGlass: rest.glyphGlass ?? false,
    texture: rest.texture ?? 'None',
    gradient: { ...DEFAULT_GRADIENT, ...rest.gradient },
    highlight: { ...DEFAULT_HIGHLIGHT, ...rest.highlight },
  }
}

function iconFromFile(file: string, artwork: Artwork): IconDef {
  const base = file.replace(/\.svg$/i, '')
  const name = base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

  return {
    id: `icon-file-${base}`,
    name: name || base,
    identifier: base.replace(/[^a-zA-Z0-9]+(.)?/g, (_, next: string) => next?.toUpperCase() ?? ''),
    glyph: 'box',
    artwork,
    metrics: { ...DEFAULT_METRICS },
    light: appearance('#0061FF'),
    dark: darkAppearance('#0061FF'),
  }
}

/** A file name nobody else in the catalogue is using. */
export function artworkFileFor(identifier: string, taken: Set<string>) {
  const base = (identifier.trim() || 'icon').replace(/[^a-zA-Z0-9._-]/g, '-') || 'icon'
  let file = `${base}.svg`
  let index = 2
  while (taken.has(file)) {
    file = `${base}-${index}.svg`
    index += 1
  }
  return file
}

export async function writeLibrary(icons: IconDef[], group: unknown): Promise<boolean> {
  const files: Record<string, string> = {}
  const records: IconRecord[] = icons.map((icon) => {
    const { artwork, ...rest } = icon
    if (artwork) files[artwork.file] = serializeSvg(artwork)
    return { ...rest, artworkFile: artwork?.file }
  })

  try {
    const response = await fetch('/api/library', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ icons: records, group, files }),
    })
    if (response.ok) return true
  } catch {
    // No middleware: the browser keeps it.
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ catalogue: { version: 1, icons: records, group }, files }),
    )
    return true
  } catch {
    return false
  }
}
