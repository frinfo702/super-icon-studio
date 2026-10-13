import {
  METAL_BANDS,
  cardBox,
  cardRadius,
  cardShortSide,
  type Gradient,
  type IconDef,
  type Mode,
  type Texture,
} from './model'

/** Keeps coordinates short in the written file. */
const svgNumber = (value: number) => Number(value.toFixed(2))

/** The metal finish, drawn with SVG gradients, a blur and a turbulence grain. */
function textureMarkup(texture: Texture, box: { width: number; height: number }, ring: number, radius: number, short: number) {
  if (texture === 'None') return { defs: '', layers: '' }

  const x = ring
  const y = ring
  const blur = Math.max(0.5, short * 0.03)
  const defs = [
    `<radialGradient id="metalGlow" gradientUnits="userSpaceOnUse" cx="${svgNumber(x + box.width * 0.22)}" cy="${svgNumber(y + box.height * 0.06)}" r="${svgNumber(Math.max(box.width, box.height) * 0.9)}">`,
    `<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.85"/><stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/>`,
    `</radialGradient>`,
    `<linearGradient id="metalBands" x1="0" y1="0" x2="1" y2="1">`,
    METAL_BANDS.map(
      ([offset, colour, alpha]) =>
        `<stop offset="${offset}" stop-color="${colour}" stop-opacity="${alpha}"/>`,
    ).join(''),
    `</linearGradient>`,
    `<filter id="metalBlur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${svgNumber(blur)}"/></filter>`,
    `<filter id="metalGrain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>`,
    `<clipPath id="cardClip"><rect x="${x}" y="${y}" width="${box.width}" height="${box.height}" rx="${radius}" ry="${radius}"/></clipPath>`,
  ].join('')

  const face = `x="${x}" y="${y}" width="${box.width}" height="${box.height}"`
  const layers = [
    `<g clip-path="url(#cardClip)">`,
    `<g style="mix-blend-mode:overlay" filter="url(#metalBlur)">`,
    `<rect ${face} fill="url(#metalBands)"/>`,
    `<rect ${face} fill="url(#metalGlow)"/>`,
    `</g>`,
    `<rect ${face} filter="url(#metalGrain)" style="mix-blend-mode:soft-light" opacity="0.4"/>`,
    `</g>`,
  ].join('')

  return { defs, layers }
}

/** The drawing's own box, or a square canvas twice as wide with the drawing centred in it. */
function canvasAttributes(canvas: { size: number; coverage: number } | undefined, width: number, height: number) {
  if (!canvas) return `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`

  const side = Math.max(width, height) / canvas.coverage
  const x = width / 2 - side / 2
  const y = height / 2 - side / 2
  return `width="${canvas.size}" height="${canvas.size}" viewBox="${svgNumber(x)} ${svgNumber(y)} ${svgNumber(side)} ${svgNumber(side)}"`
}

function gradientMarkup(g: Gradient, size: number, offset: number) {
  const alpha = Math.min(1, g.strength / 100) * 0.35
  const fade = Math.max(10, Math.min(95, g.sizeY / 6)) / 100
  const stops = `<stop offset="0" stop-color="#FFFFFF" stop-opacity="${alpha}"/><stop offset="${fade}" stop-color="#FFFFFF" stop-opacity="0"/>`

  if (g.style === 'Linear') {
    const radians = ((180 + g.offsetX) * Math.PI) / 180
    const dx = Math.sin(radians)
    const dy = -Math.cos(radians)
    const length = Math.abs(dx) * size + Math.abs(dy) * size
    const cx = (50 + g.offsetX) / 100
    const cy = (50 + g.offsetY) / 100
    const x1 = cx * size - (dx * length) / 2
    const y1 = cy * size - (dy * length) / 2
    return `<linearGradient id="finish" gradientUnits="userSpaceOnUse" x1="${offset + x1}" y1="${offset + y1}" x2="${offset + x1 + dx * length}" y2="${offset + y1 + dy * length}">${stops}</linearGradient>`
  }

  // Angular gradients are not expressible in SVG 1.1; they export as the radial equivalent.
  const cx = ((50 + g.offsetX) / 100) * size
  const cy = ((50 + g.offsetY) / 100) * size
  const rx = (g.sizeX / 100) * size
  const ry = (g.sizeY / 100) * size
  const squash = rx > 0 ? ry / rx : 1
  const transform = `translate(${offset + cx} ${offset + cy}) scale(1 ${squash}) translate(${-offset - cx} ${-offset - cy})`
  return `<radialGradient id="finish" gradientUnits="userSpaceOnUse" cx="${offset + cx}" cy="${offset + cy}" r="${rx}" gradientTransform="${transform}">${stops}</radialGradient>`
}

/**
 * How an app icon opens in Apple's Icon Composer, which lays the artwork out on its own
 * canvas: a macOS icon sits in 824 of 1024 points, so the drawing covers ~80% of a 512 point
 * canvas with the margin around it. 384 points keeps the card and its highlight ring there.
 */
export const ICON_COMPOSER = { size: 512, card: 384, coverage: 824 / 1024 }

/**
 * Writes the finished icon — highlight ring, card, finish and glyph — as a standalone SVG.
 * The glyph is cloned out of the live DOM, so custom imports and bundled glyphs both export
 * the same geometry that is on screen. The drop shadow and the inset vignette are drawn here
 * as an SVG filter; the browser preview's gradient blend modes are not carried over.
 */
export function buildIconSvg(
  icon: IconDef,
  mode: Mode,
  size: number,
  /** Sizes the canvas around the drawing, at `coverage` of it, instead of the drawing itself. */
  canvas?: { size: number; coverage: number },
): string | null {
  const source = document.querySelector(`[data-icon="${icon.id}"] svg`)
  if (!source) return null

  const a = icon[mode]
  const box = cardBox(icon.metrics.shape, size)
  const short = cardShortSide(icon.metrics.shape, size)
  const ring = Math.max(1, short * 0.032)
  const totalWidth = box.width + ring * 2
  const totalHeight = box.height + ring * 2
  const radius = cardRadius(icon.metrics.shape, icon.metrics.cornerRadius, size)
  const glyphSize = short * 0.44 * (icon.metrics.glyphScale / 100)
  const shadow = short * 0.045

  const glyph = source.cloneNode(true) as SVGSVGElement
  glyph.setAttribute('width', String(glyphSize))
  glyph.setAttribute('height', String(glyphSize))
  glyph.setAttribute('x', String((totalWidth - glyphSize) / 2))
  glyph.setAttribute('y', String((totalHeight - glyphSize) / 2))
  glyph.setAttribute('color', a.glyph)
  for (const path of glyph.querySelectorAll('path')) {
    if (path.getAttribute('stroke') !== 'none') path.setAttribute('stroke', a.glyph)
  }

  const card = `<rect x="${ring}" y="${ring}" width="${box.width}" height="${box.height}" rx="${radius}" ry="${radius}" fill="${a.card}"/>`
  const finish = `<rect x="${ring}" y="${ring}" width="${box.width}" height="${box.height}" rx="${radius}" ry="${radius}" fill="url(#finish)"/>`
  const texture = textureMarkup(a.texture, box, ring, radius, short)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" ${canvasAttributes(canvas, totalWidth, totalHeight)}>`,
    `<title>${icon.name}</title>`,
    `<defs>${gradientMarkup(a.gradient, short, ring)}`,
    `<filter id="shadow" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="${shadow}" stdDeviation="${shadow}" flood-color="#000000" flood-opacity="0.16"/></filter>`,
    texture.defs,
    `</defs>`,
    `<g filter="url(#shadow)">${card}</g>`,
    `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" rx="${radius + ring}" ry="${radius + ring}" fill="${a.highlight.color}" fill-opacity="${a.highlight.opacity / 100}"/>`,
    card,
    finish,
    texture.layers,
    glyph.outerHTML,
    `</svg>`,
  ].join('')
}

export function downloadSvg(filename: string, markup: string) {
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
