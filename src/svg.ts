import type { PathData } from './model'

function readAttrs(source: string) {
  const get = (name: string) =>
    source.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1]
  return {
    d: get('d'),
    fill: get('fill'),
    stroke: get('stroke'),
    strokeWidth: get('stroke-width'),
  }
}

/**
 * Reads <path> elements out of an SVG file. Other element types (rect, circle, groups)
 * are ignored, as are transforms and stylesheets.
 * shortcut: paths only, no transforms; upgrade to a real SVG parser if icons start
 * shipping as shapes or nested groups instead of paths.
 */
export function parseSvg(source: string): { viewBox: string; paths: PathData[] } | null {
  const root = readAttrs(source.match(/<svg\b[^>]*>/i)?.[0] ?? '')
  const viewBox = source.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1] ?? '0 0 24 24'
  const paths: PathData[] = []

  for (const match of source.matchAll(/<path\b([^>]*?)\/?>/gi)) {
    const attrs = readAttrs(match[1])
    if (!attrs.d) continue
    const stroke = attrs.stroke ?? root.stroke
    paths.push({
      d: attrs.d,
      fill: attrs.fill ?? root.fill ?? (stroke ? 'none' : 'currentColor'),
      stroke: stroke ?? 'none',
      strokeWidth: Number(attrs.strokeWidth ?? root.strokeWidth ?? 1.8),
    })
  }

  return paths.length > 0 ? { viewBox, paths } : null
}

const NS = 'http://www.w3.org/2000/svg'

/** How much of its box bundled glyph artwork fills; imported art is fitted to the same. */
const GLYPH_FILL = 0.833

/**
 * Fits artwork to a square box centred on its own bounds, so an icon drawn with padding
 * or off-centre lands in the card the same way a bundled glyph does. Returns null when the
 * paths have no measurable geometry.
 */
export function trimPaths(
  paths: PathData[],
  viewBox: string,
): { viewBox: string; paths: PathData[] } | null {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', viewBox)
  svg.setAttribute('style', 'position:absolute;left:-10000px;top:0;width:100px;height:100px')

  const group = document.createElementNS(NS, 'g')
  for (const path of paths) {
    const element = document.createElementNS(NS, 'path')
    element.setAttribute('d', path.d)
    element.setAttribute('fill', path.fill)
    element.setAttribute('stroke', path.stroke)
    element.setAttribute('stroke-width', String(path.strokeWidth))
    group.append(element)
  }

  svg.append(group)
  document.body.append(svg)
  const bounds = group.getBBox()
  const bleed = paths.reduce(
    (widest, path) => (path.stroke === 'none' ? widest : Math.max(widest, path.strokeWidth / 2)),
    0,
  )
  svg.remove()

  const side = Math.max(bounds.width, bounds.height) + bleed * 2
  if (!(side > 0)) return null

  const box = side / GLYPH_FILL
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  // Rounded, so the written file is readable and the round trip lands on the same numbers.
  const trim = (value: number) => Number(value.toFixed(2))
  return {
    viewBox: `${trim(centerX - box / 2)} ${trim(centerY - box / 2)} ${trim(box)} ${trim(box)}`,
    paths,
  }
}

/** Writes artwork back out in the subset of SVG this app reads, for the icons folder. */
export function serializeSvg(artwork: { viewBox: string; paths: PathData[] }) {
  const body = artwork.paths
    .map(
      (path) =>
        `<path d="${path.d}" fill="${path.fill}" stroke="${path.stroke}" stroke-width="${path.strokeWidth}"/>`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${artwork.viewBox}">${body}</svg>`
}

/**
 * The app draws one glyph colour per appearance, so artwork arriving from outside is
 * re-pointed at `currentColor`. Gradients and empty fills are left alone.
 */
export function toCurrentColor(source: string) {
  return source.replace(/(fill|stroke)="(?!none|url|currentColor)([^"]+)"/gi, '$1="currentColor"')
}

/**
 * Turns a file's contents into artwork. Files arriving from outside are trimmed and
 * flattened to the glyph colour; files that came back out of the icons folder are already
 * through this, and doing it again would shrink them a little on every round trip.
 */
export function parseArtwork(
  source: string,
  file: string,
  { trim }: { trim: boolean },
): { file: string; viewBox: string; paths: PathData[] } | null {
  const parsed = parseSvg(trim ? toCurrentColor(source) : source)
  if (!parsed) return null
  const fitted = trim ? (trimPaths(parsed.paths, parsed.viewBox) ?? parsed) : parsed
  return { file, viewBox: fitted.viewBox, paths: fitted.paths }
}
