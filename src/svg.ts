import type { Artwork, PathData } from './model'

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
 * Reads the flat subset of a drawing: `<path>` elements with their own `d`, `fill`, `stroke` and
 * `stroke-width`, over the `<svg>` tag's presentation attributes. It is what the point editor
 * works on; a drawing that uses anything else is drawn from its markup instead.
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

/** Marks the group a drawing is kept in, so a file the app wrote is not scoped a second time. */
const WRAPPER = 'data-artwork'

/** A box the app can draw: four numbers, so a file cannot write anything else into one. */
const BOX = /^-?[\d.]+(?:e[-+]?\d+)?(?:[ ,]+-?[\d.]+(?:e[-+]?\d+)?){3}$/i

/** Elements that carry behaviour rather than drawing. */
const BANNED = new Set(['script', 'foreignObject', 'iframe', 'object', 'embed', 'audio', 'video'])

/** The root's own attributes that say where the drawing sits, not how it is drawn. */
const BOX_ATTRS = new Set([
  'viewBox',
  'width',
  'height',
  'x',
  'y',
  'preserveAspectRatio',
  'version',
  'baseProfile',
])

/** The attributes the point editor can carry off a path; anything else makes the drawing its own. */
const PLAIN_ATTRS = new Set(['d', 'fill', 'stroke', 'stroke-width'])

/** What a drawing may hold besides its paths: notes about it, which no editor changes. */
const NOTES = /<(?:title|desc|metadata)\b[^>]*>[\s\S]*?<\/(?:title|desc|metadata)>/gi

/* -------------------------------------------------------------------- the drawing a file holds */

/** A file's `<svg>` root, read as XML where the file allows it and as markup where it does not. */
function readRoot(source: string) {
  const xml = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement
  if (xml?.localName === 'svg') return xml
  return new DOMParser().parseFromString(source, 'text/html').querySelector('svg')
}

/** The box the drawing's own coordinates are in, from `viewBox` or from the file's width and height. */
function drawingBox(root: Element) {
  const viewBox = root.getAttribute('viewBox')?.trim() ?? ''
  if (BOX.test(viewBox)) return viewBox
  const side = (name: string) => Number((root.getAttribute(name) ?? '').replace(/px$/i, ''))
  const width = side('width')
  const height = side('height')
  return width > 0 && height > 0 ? `0 0 ${width} ${height}` : '0 0 24 24'
}

/**
 * A stylesheet may only reach inside the file it came with: imports and references to anything
 * else would pull the app's page (or a network fetch) into an imported icon.
 */
export function tameStyle(text: string) {
  return (
    text
      .replace(/url\(\s*(?!["']?(?:#|data:))[^)]*\)/gi, 'none')
      // An at-rule is what reaches another stylesheet, and CSS lets the spelling be escaped
      // (`@\69 mport`), so the filter reads the character rather than the word. A block's body
      // is ordinary rules, which stay and the browser still reads.
      .replace(/@[^;{}]*(?:[;{]|$)/g, '')
  )
}

/** An attribute's reference to a paint server, clip or filter, held to the file it came with. */
export function tameReference(value: string) {
  return value.replace(/url\(\s*(?!["']?(?:#|data:))[^)]*\)/gi, '').trim()
}

/**
 * Drops what only a document can do rather than a drawing: scripts, embedded documents, event
 * handlers and the references that reach outside the file. An imported file is someone else's
 * document, and the app renders it in its own page.
 */
function sanitize(element: Element) {
  const drop: Element[] = []
  for (const child of element.children) {
    if (BANNED.has(child.localName)) drop.push(child)
    else sanitize(child)
  }
  for (const child of drop) child.remove()

  if (element.localName === 'style') element.textContent = tameStyle(element.textContent ?? '')

  for (const name of element.getAttributeNames()) {
    const value = element.getAttribute(name) ?? ''
    const lower = name.toLowerCase()
    const reference = lower === 'href' || lower.endsWith(':href')
    if (lower.startsWith('on') || /javascript:/i.test(value)) element.removeAttribute(name)
    else if (reference && !value.startsWith('#') && !value.startsWith('data:image/')) {
      element.removeAttribute(name)
    } else if (lower === 'style') {
      element.setAttribute(name, tameStyle(value))
    } else if (value.includes('url(')) {
      element.setAttribute(name, tameReference(value))
    }
  }
}

/**
 * Makes a drawing's ids and stylesheet its own: ids take the drawing's key, stylesheet selectors
 * are scoped to its wrapper. Two imported icons on one page cannot reach into each other, and an
 * imported stylesheet cannot reach the app's own page.
 */
function scope(element: Element, token: string) {
  const prefix = `${token}-`
  const elements = [element, ...element.querySelectorAll('*')]

  for (const node of elements) {
    const id = node.getAttribute('id')
    if (id) node.setAttribute('id', `${prefix}${id}`)
  }

  const reference = (value: string) =>
    value.replace(/url\(\s*#([^)\s"']+)\s*\)/g, (_, id: string) => `url(#${prefix}${id})`)

  for (const node of elements) {
    for (const name of node.getAttributeNames()) {
      const value = node.getAttribute(name) ?? ''
      if (name === 'id' || !value.includes('#')) continue
      if (name === 'href' || name.endsWith(':href')) {
        node.setAttribute(name, `#${prefix}${value.slice(1)}`)
      } else {
        node.setAttribute(name, reference(value))
      }
    }
  }

  for (const style of element.querySelectorAll('style')) {
    const text = reference(style.textContent ?? '')
    style.textContent = text.replace(/([^{}]+)\{/g, (rule, selectors: string) =>
      selectors.includes('@')
        ? rule
        : `${selectors
            .split(',')
            .map(
              (selector) =>
                `.${token} ${selector.trim().replace(/#([\w-]+)/g, `#${prefix}$1`)}`,
            )
            .join(', ')}{`,
    )
  }
}

/**
 * The group a drawing is kept in: the root's own presentation attributes on a `<g>` the app can
 * draw, around the root's children. What the root said about its own box is left behind — the
 * app draws the drawing in a box of its own.
 */
function wrap(root: Element, token: string) {
  const wrapper = root.ownerDocument.createElementNS(NS, 'g')
  for (const name of root.getAttributeNames()) {
    if (BOX_ATTRS.has(name) || name.startsWith('xmlns')) continue
    wrapper.setAttribute(name, root.getAttribute(name) ?? '')
  }
  wrapper.setAttribute(WRAPPER, token)
  wrapper.setAttribute('class', [wrapper.getAttribute('class'), token].filter(Boolean).join(' '))
  while (root.firstChild) wrapper.append(root.firstChild)
  return wrapper
}

/** A file's drawing: the box it is drawn in, and the wrapper the app renders and writes back. */
function readDrawing(source: string, file: string) {
  const root = readRoot(source)
  if (!root) return null

  const key = `artwork-${file.replace(/\.svg$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '-') || 'icon'}`
  const children = [...root.children]
  const [only] = children
  const written = children.length === 1 && only.localName === 'g' && only.hasAttribute(WRAPPER)
  const wrapper = written ? only : wrap(root, key)

  sanitize(wrapper)
  // A file the app wrote carries its own scoping; a fresh import is scoped as it arrives.
  if (!written) scope(wrapper, key)
  return { viewBox: drawingBox(root), wrapper }
}

/** The widest half-stroke the drawing carries, so the fit leaves room for the whole drawing. */
function strokeBleed(element: Element, inherited: { stroke: string; width: number }): number {
  const stroke = element.getAttribute('stroke') ?? inherited.stroke
  const own = Number(element.getAttribute('stroke-width'))
  const width = Number.isFinite(own) && own > 0 ? own : inherited.width
  let bleed = stroke === 'none' ? 0 : width / 2
  for (const child of element.children) {
    bleed = Math.max(bleed, strokeBleed(child, { stroke, width }))
  }
  return bleed
}

/**
 * Fits a drawing to a square box centred on its own bounds, so an icon drawn with padding or
 * off-centre lands in the card the same way a bundled glyph does. Returns null when the drawing
 * has no measurable geometry.
 */
function fitDrawing(wrapper: Element, viewBox: string): string | null {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', viewBox)
  svg.setAttribute('style', 'position:absolute;left:-10000px;top:0;width:100px;height:100px')

  const group = document.createElementNS(NS, 'g')
  group.append(wrapper)
  svg.append(group)
  document.body.append(svg)
  const bounds = group.getBBox()
  const bleed = strokeBleed(wrapper, { stroke: 'none', width: 0 })
  svg.remove()

  const side = Math.max(bounds.width, bounds.height) + bleed * 2
  if (!(side > 0)) return null

  const box = side / GLYPH_FILL
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  // Rounded, so the written file is readable and the round trip lands on the same numbers.
  const trim = (value: number) => Number(value.toFixed(2))
  return `${trim(centerX - box / 2)} ${trim(centerY - box / 2)} ${trim(box)} ${trim(box)}`
}

/* ---------------------------------------------------------------------------- the app's artwork */

/** The markup a drawing is rendered and written from. */
const markupOf = (element: Element) => new XMLSerializer().serializeToString(element)

/**
 * The drawing's paths, while it holds nothing but plain paths — an editor can change those and
 * nothing else. Groups, transforms, shapes, stylesheets and gradients have no editor.
 */
export function plainPaths(markup: string): PathData[] | undefined {
  const wrapper = markup.match(/^<g\s([^>]*)>([\s\S]*)<\/g>$/)
  const body = (wrapper ? wrapper[2] : markup).replace(NOTES, '')
  const elements = body.match(/<[^>]+>/g) ?? []
  if (elements.length === 0 || body.replace(/<[^>]+>/g, '').trim()) return undefined

  for (const element of elements) {
    const path = element.match(/^<path\b([^>]*?)\s*\/?>$/)
    if (!path) return undefined
    for (const attribute of path[1].matchAll(/([A-Za-z0-9_:.-]+)\s*=/g)) {
      if (!PLAIN_ATTRS.has(attribute[1])) return undefined
    }
  }

  return parseSvg(`<svg ${wrapper?.[1] ?? ''}>${body}</svg>`)?.paths
}

/** A layer wearing a colour of its own: not empty, not a gradient reference, not the glyph colour. */
const ownColour = (value: string) => value !== 'none' && value !== 'currentColor' && !value.startsWith('url(')

/** Every colour a drawing writes down, in its attributes and in its stylesheet. */
function writtenColours(markup: string) {
  return [
    ...[...markup.matchAll(/\s(?:fill|stroke)="([^"]*)"/gi)].map((match) => match[1].trim()),
    ...[...markup.matchAll(/(?:^|[^-\w])(?:fill|stroke)\s*:\s*([^;"'}]*)/gi)].map((match) =>
      match[1].trim(),
    ),
  ]
}

/** Whether the drawing carries a colour of its own, which is what merging would replace. */
export function hasOwnColours(artwork: Artwork) {
  if (artwork.paths) return artwork.paths.some((path) => ownColour(path.fill) || ownColour(path.stroke))
  return writtenColours(artwork.markup).some(ownColour)
}

/**
 * Turns a file's contents into artwork. An import keeps the drawing as it arrived — its shapes,
 * its groups and transforms, its stylesheet, its colours — and is fitted to the card the way a
 * bundled glyph is. The paths come with it while the drawing is nothing but plain paths, which is
 * the part the point editor can change.
 */
export function parseArtwork(
  source: string,
  file: string,
  { trim }: { trim: boolean },
): Artwork | null {
  const drawing = readDrawing(source, file)
  if (!drawing) return null

  const markup = markupOf(drawing.wrapper)
  // A file out of the icons folder is already fitted; fitting it again would shrink it a little
  // on every round trip.
  const viewBox = trim
    ? (fitDrawing(drawing.wrapper, drawing.viewBox) ?? drawing.viewBox)
    : drawing.viewBox
  return { file, viewBox, markup, paths: plainPaths(markup) }
}

/**
 * The step after an import: draws every layer in one colour, the glyph colour of the appearance
 * the icon is shown in, for a drawing that arrived in colours that do not fit the set. Empty
 * layers, gradient references and the rest of a stylesheet keep what they hold.
 */
export function mergeColours(artwork: Artwork): Artwork {
  const one = (value: string) =>
    value === 'none' || value.startsWith('url(') ? value : 'currentColor'
  const markup = artwork.markup
    .replace(
      /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
      (_, open: string, css: string, close: string) => `${open}${restyle(css)}${close}`,
    )
    .replace(/(\sfill|\sstroke)="([^"]*)"/gi, (_, name: string, value: string) => `${name}="${one(value)}"`)
    .replace(/\sstyle="([^"]*)"/gi, (_, css: string) => ` style="${restyle(css)}"`)

  return { ...artwork, markup, paths: plainPaths(markup) }
}

/** The colours written down in a style attribute or a stylesheet, in the glyph colour instead. */
function restyle(css: string) {
  return css.replace(
    /(^|[;{])(\s*)(fill|stroke)(\s*:\s*)([^;}]*?)(?=[;}]|$)/gi,
    (_, start: string, space: string, property: string, colon: string, value: string) =>
      `${start}${space}${property}${colon}${
        value.trim() === 'none' || value.trim().startsWith('url(') ? value : 'currentColor'
      }`,
  )
}

/** Redraws a drawing from the paths the editor changed, keeping the drawing's own wrapper and
 *  the notes that came with it. */
export function withPaths(artwork: Artwork, paths: PathData[]): Artwork {
  const opener = artwork.markup.match(/^<g\s[^>]*>/)?.[0] ?? ''
  const notes = artwork.markup.match(NOTES)?.join('') ?? ''
  const body = paths
    .map(
      (path) =>
        `<path d="${path.d}" fill="${path.fill}" stroke="${path.stroke}" stroke-width="${path.strokeWidth}"/>`,
    )
    .join('')
  return { ...artwork, markup: opener ? `${opener}${notes}${body}</g>` : body, paths }
}

/** Writes artwork back out for the icons folder. */
export function serializeSvg(artwork: Artwork) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${artwork.viewBox}">${artwork.markup}</svg>`
}
