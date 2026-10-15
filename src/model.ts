import type { GlyphName } from './glyphs'

export type Mode = 'light' | 'dark'

export const GRADIENT_STYLES = ['Radial', 'Linear', 'Angular'] as const
export type GradientStyle = (typeof GRADIENT_STYLES)[number]

export const BLEND_MODES = ['Normal', 'Multiply', 'Screen', 'Overlay', 'Soft light'] as const
export type BlendMode = (typeof BLEND_MODES)[number]

export type Gradient = {
  strength: number
  style: GradientStyle
  blend: BlendMode
  offsetX: number
  offsetY: number
  sizeX: number
  sizeY: number
}

export type Highlight = {
  color: string
  opacity: number
  blend: BlendMode
  blur: number
}

export type Appearance = {
  card: string
  glyph: string
  labels: Label[]
  background: Background
  glyphGlass: boolean
  texture: Texture
  gradient: Gradient
  highlight: Highlight
}

export type Metrics = {
  glyphScale: number
  cornerRadius: number
  shape: Shape
  /** Where the glyph sits in the card, as a percentage of the card's short side. */
  glyphOffset: { x: number; y: number }
  /** A corner folded back, showing the underside of the card. */
  peel: boolean
}

export const TEXTURES = ['None', 'Liquid metal'] as const
export type Texture = (typeof TEXTURES)[number]

/**
 * What sits under the card's colour and finish: nothing, a plain grid, or the grid and
 * circles an app-icon template draws over the artwork.
 */
export const BACKGROUNDS = ['Plain', 'Grid', 'Blueprint', 'Liquid glass'] as const
export type Background = (typeof BACKGROUNDS)[number]

/**
 * A component sits over the card with a line of text in a badge, the way a build badge reads.
 * Its size and its place are shares of the card's short side, so it keeps them at every size;
 * its colours are per appearance, like the rest of the finish.
 */
export type Label = {
  id: string
  text: string
  /** How tall the letters are, as a percentage of the card's short side. */
  size: number
  /** Where the badge's centre sits, from the card's centre, as a percentage of its short side. */
  x: number
  y: number
  shape: LabelShape
  /** The corner radius, as a share of the badge's height, while the shape is Rounded. */
  radius: number
  background: LabelBackground
  /** How much of the badge's background shows, the way the text does not. */
  opacity: number
  color: string
  /** The solid fill, or where a gradient starts. */
  fill: string
  /** Where a gradient ends. */
  fillEnd: string
  /** A gradient's direction, in the degrees CSS reads: 0 points up, 90 to the right. */
  angle: number
  highlight: LabelHighlight
  highlightColor: string
  highlightOpacity: number
}

export const LABEL_SHAPES = ['Pill', 'Rounded', 'Square'] as const
export type LabelShape = (typeof LABEL_SHAPES)[number]

/**
 * What the badge sits on: nothing, a colour of its own, a gradient of its own, or the card's
 * own colour and finish. A component that inherits needs no colours of its own, and picks up
 * whatever the card is given in the mode it is drawn in.
 */
export const LABEL_BACKGROUNDS = ['None', 'Solid', 'Gradient', 'Inherit'] as const
export type LabelBackground = (typeof LABEL_BACKGROUNDS)[number]

/** Where the badge's ring comes from: the two values it holds, or the card's highlight. */
export const LABEL_HIGHLIGHTS = ['Custom', 'Inherit'] as const
export type LabelHighlight = (typeof LABEL_HIGHLIGHTS)[number]

/** How far a component can be dragged from the card's centre, as a percentage of its short side. */
export const LABEL_RANGE = 50

/** How much room the text gets inside the badge, against its own size. */
export const LABEL_PADDING = 0.45

export const DEFAULT_LABEL: Omit<Label, 'id'> = {
  text: '',
  size: 15,
  x: 0,
  y: 30,
  shape: 'Pill',
  radius: 25,
  background: 'Solid',
  opacity: 100,
  color: '#FFFFFF',
  fill: '#1C1C1E',
  fillEnd: '#48484A',
  angle: 180,
  highlight: 'Custom',
  highlightColor: '#FFFFFF',
  highlightOpacity: 18,
}

/** The text a component starts life with, so a fresh one shows what it is for. */
export const LABEL_PLACEHOLDER = 'BETA'

/** Where a component's badge sits and how its corners are rounded, in the card's own units. */
export function labelBox(label: Label, card: { width: number; height: number }, short: number) {
  const fontSize = (short * label.size) / 100
  const height = fontSize * (1 + LABEL_PADDING)
  return {
    fontSize,
    height,
    radius: label.shape === 'Pill' ? height / 2 : label.shape === 'Square' ? 0 : (height * label.radius) / 100,
    cx: card.width / 2 + (short * label.x) / 100,
    cy: card.height / 2 + (short * label.y) / 100,
  }
}

/**
 * The line a badge's own gradient runs along, in the badge's box: the way CSS reads an angle,
 * and long enough to span the box at it, so the preview and the exporter draw the same one.
 */
export function gradientLine(angle: number, box: { width: number; height: number }) {
  const radians = (angle * Math.PI) / 180
  const dx = Math.sin(radians)
  const dy = -Math.cos(radians)
  const length = Math.abs(dx) * box.width + Math.abs(dy) * box.height
  const x = box.width / 2
  const y = box.height / 2

  return {
    x1: x - (dx * length) / 2,
    y1: y - (dy * length) / 2,
    x2: x + (dx * length) / 2,
    y2: y + (dy * length) / 2,
  }
}

/** The ring a component draws: the card's highlight, or the two values the badge holds. */
export function labelRing(label: Label, a: Appearance) {
  if (label.highlight === 'Custom') return { color: label.highlightColor, opacity: label.highlightOpacity }
  return { color: a.highlight.color, opacity: a.highlight.opacity }
}

/**
 * The glass surface: the wash over the card, the light along its top edge, the shadow along
 * its bottom edge, and how far a glass glyph moves towards white with its rim light and its
 * float shadow. Each renderer turns these into its own gradients and filters.
 */
export const GLASS = {
  wash: [
    ['0%', '#FFFFFF', 0.34],
    ['45%', '#FFFFFF', 0.05],
    ['100%', '#FFFFFF', 0.2],
  ] as [string, string, number][],
  edge: [
    ['0%', '#FFFFFF', 0.55],
    ['7%', '#FFFFFF', 0],
    ['93%', '#000000', 0],
    ['100%', '#000000', 0.22],
  ] as [string, string, number][],
  glyphOpacity: 0.92,
  glyphRim: { dy: -0.4, blur: 0.2, opacity: 0.55 },
  glyphShadow: { dy: 0.6, blur: 0.8, opacity: 0.35 },
}

/**
 * The blueprint drawing, in a 100 × 100 square. The preview and the exporter both scale that
 * square to cover the card and centre it, so the circles stay circles; the guides are drawn
 * in the glyph colour.
 */
export const BLUEPRINT = {
  inset: 8,
  radius: 20,
  grid: [8, 22, 36, 50, 64, 78, 92],
  circles: [21, 42],
  stroke: 0.55,
  opacity: 0.35,
}

/**
 * The folded corner: how much of the card's short side the flap takes, and how far its
 * underside runs from the light it catches at the fold to the shadow at the corner.
 */
export const PEEL = { size: 0.34, lighten: 0.3, darken: 0.35 }

/**
 * The chrome banding of the liquid metal finish, as offset / colour / alpha. The renderer
 * builds a conic gradient from it and the exporter a linear one, so both stay in step.
 */
export const METAL_BANDS: [string, string, number][] = [
  ['0%', '#FFFFFF', 0.55],
  ['14%', '#000000', 0.34],
  ['30%', '#FFFFFF', 0.62],
  ['46%', '#000000', 0.28],
  ['64%', '#FFFFFF', 0.5],
  ['82%', '#000000', 0.32],
  ['100%', '#FFFFFF', 0.55],
]

export const SHAPES = ['Square', 'Wide', 'Tall', 'Circle'] as const
export type Shape = (typeof SHAPES)[number]

/** The card's outline, with `size` as its longest side. */
export function cardBox(shape: Shape, size: number) {
  switch (shape) {
    case 'Wide':
      return { width: size, height: size * 0.75 }
    case 'Tall':
      return { width: size * 0.75, height: size }
    default:
      return { width: size, height: size }
  }
}

/**
 * The side the finish, the glyph and any frame are measured against: a wide card keeps its
 * corner radius, glyph and highlight ring in proportion to its short side.
 */
export function cardShortSide(shape: Shape, size: number) {
  const box = cardBox(shape, size)
  return Math.min(box.width, box.height)
}

export function cardRadius(shape: Shape, cornerRadius: number, size: number) {
  const short = cardShortSide(shape, size)
  return shape === 'Circle' ? short / 2 : (short * cornerRadius) / 100
}

export type PathData = {
  d: string
  fill: string
  stroke: string
  strokeWidth: number
}

export type Artwork = {
  /** File name inside the icons folder. */
  file: string
  /** The box the drawing is drawn in, in its own coordinates. */
  viewBox: string
  /** The drawing as it arrived, rendered as it is: shapes, groups, transforms, stylesheets and
   *  gradients all survive the import, colours included. */
  markup: string
  /** The drawing's paths, while it holds nothing but plain paths: what the point editor changes. */
  paths?: PathData[]
}

export type IconDef = {
  id: string
  name: string
  identifier: string
  glyph: GlyphName
  artwork?: Artwork
  metrics: Metrics
  light: Appearance
  dark: Appearance
}

export type SizePreset = {
  id: string
  name: string
  sizes: number[]
  /** The size a fresh pick of this preset previews at. */
  defaultSize: number
}

/// The ladders icons are inspected at, by where they ship.
export const SIZE_PRESETS: SizePreset[] = [
  { id: 'interface', name: 'Interface', sizes: [12, 16, 24, 32, 48], defaultSize: 48 },
  { id: 'macos', name: 'macOS app', sizes: [16, 32, 64, 128, 256, 512], defaultSize: 128 },
  { id: 'ios', name: 'iOS app', sizes: [20, 29, 40, 60, 76, 1024], defaultSize: 60 },
  { id: 'watchos', name: 'watchOS app', sizes: [24, 33, 44, 50, 86, 117], defaultSize: 44 },
  { id: 'web', name: 'Web & favicon', sizes: [16, 32, 48, 64, 180, 512], defaultSize: 48 },
]

export const DEFAULT_GRADIENT: Gradient = {
  strength: 200,
  style: 'Radial',
  blend: 'Normal',
  offsetX: 0,
  offsetY: -50,
  sizeX: 300,
  sizeY: 250,
}

export const DEFAULT_HIGHLIGHT: Highlight = {
  color: '#FFFFFF',
  opacity: 100,
  blend: 'Normal',
  blur: 0,
}

export const DEFAULT_METRICS: Metrics = {
  glyphScale: 125,
  cornerRadius: 30,
  shape: 'Square',
  glyphOffset: { x: 0, y: 0 },
  peel: false,
}

/** How much of the card the glyph covers before the glyph scale is applied. */
export const GLYPH_BASE = 0.44

/** The next component name neither appearance is using, so both draw the same component. */
export function nextLabelId(icon: IconDef) {
  const taken = new Set([...icon.light.labels, ...icon.dark.labels].map((label) => label.id))
  let index = 1
  while (taken.has(`label-${index}`)) index += 1
  return `label-${index}`
}

export function appearance(card: string, glyph = '#FFFFFF'): Appearance {
  return {
    card,
    glyph,
    labels: [],
    background: 'Plain',
    glyphGlass: false,
    texture: 'None',
    gradient: { ...DEFAULT_GRADIENT },
    highlight: { ...DEFAULT_HIGHLIGHT },
  }
}

export function darkAppearance(card: string, glyph = '#FFFFFF'): Appearance {
  const base = appearance(card, glyph)
  return {
    ...base,
    gradient: { ...base.gradient, strength: 150 },
    highlight: { ...base.highlight, opacity: 40 },
  }
}

/** Where one appearance starts life, which is what Reset puts back. */
export function defaultFinish(mode: Mode): { gradient: Gradient; highlight: Highlight } {
  const base = mode === 'light' ? appearance('') : darkAppearance('')
  return { gradient: base.gradient, highlight: base.highlight }
}

/**
 * Keeps the hero preview between 40 and 600 points on screen whatever the size ladder
 * asks for, so a 1024pt app icon does not paint a wall across the canvas.
 */
export function zoomFor(size: number, zoom: number) {
  const min = Math.max(0.2, Math.min(10, 40 / size))
  const max = Math.min(10, Math.max(min, 420 / size))
  return Math.min(Math.max(zoom, min), max)
}

/** Tiles above this size are listed as chips: a 1024pt icon cannot sit on a canvas at 1:1. */
export const TILE_CAP = 128
