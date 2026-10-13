import { GLYPH_BASE, cardBox, cardShortSide, type IconDef } from './model.ts'

export const GROUP_LAYOUTS = ['Horizontal', 'Vertical'] as const
export type GroupLayout = (typeof GROUP_LAYOUTS)[number]

export const ANIMATION_STYLES = ['Spring', 'Ease out', 'Ease in out', 'Linear'] as const
export type AnimationStyle = (typeof ANIMATION_STYLES)[number]

export const EASINGS: Record<AnimationStyle, string> = {
  Spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  'Ease out': 'cubic-bezier(0.16, 1, 0.3, 1)',
  'Ease in out': 'cubic-bezier(0.65, 0, 0.35, 1)',
  Linear: 'linear',
}

/**
 * A deck of icons that reads as one: the app renders these as tab and toolbar icons. The
 * layers list runs front to back, `depth` says how many of them are drawn, and everything
 * else is the finish of the arrangement.
 */
export type IconGroup = {
  id: string
  name: string
  layers: string[]
  depth: number
  layout: GroupLayout
  autoGap: boolean
  gap: number
  scale: boolean
  scaleAmount: number
  rotate: boolean
  rotateAmount: number
  offset: boolean
  offsetAmount: number
  reserveSlots: boolean
  glyphOffset: boolean
  glyphOffsetAmount: number
  animation: { duration: number; stagger: number; style: AnimationStyle }
}

export const DEFAULT_GROUP: IconGroup = {
  id: 'group-preview-tab',
  name: 'Preview Tab',
  layers: [],
  depth: 4,
  layout: 'Horizontal',
  autoGap: true,
  gap: 11,
  scale: true,
  scaleAmount: 15,
  rotate: true,
  rotateAmount: 5,
  offset: true,
  offsetAmount: 0,
  reserveSlots: false,
  glyphOffset: true,
  glyphOffsetAmount: 30,
  animation: { duration: 0.45, stagger: 0.08, style: 'Spring' },
}

/** The gap used when it is worked out rather than dialled in. */
export const AUTO_GAP = 40

export type Slot = {
  icon: IconDef
  x: number
  y: number
  width: number
  height: number
  size: number
  rotation: number
  glyphDx: number
  glyphDy: number
}

export type GroupGeometry = { slots: Slot[]; width: number; height: number }

/**
 * Places the layers. Each one steps along the layout axis by the gap, shrinks by the scale
 * amount, leans by the rotate amount and slides by the offset amount; the glyph inside each
 * card moves the other way so it stays in the exposed strip of the deck.
 */
export function layoutGroup(group: IconGroup, icons: IconDef[], unit: number): GroupGeometry {
  const horizontal = group.layout === 'Horizontal'
  const gap = ((group.autoGap ? AUTO_GAP : group.gap) / 100) * unit
  const drawCount = Math.min(Math.max(group.depth, 0), group.layers.length)
  // Empty slots keep their footprint, so a deck does not shrink as layers drop out.
  const spanCount = group.reserveSlots ? group.layers.length : drawCount

  const slots: Slot[] = []
  let width = 0
  let height = 0

  for (let index = 0; index < spanCount; index += 1) {
    const icon = icons.find((candidate) => candidate.id === group.layers[index])
    const size = group.scale ? unit * Math.max(0.2, 1 - (index * group.scaleAmount) / 100) : unit
    const box = icon ? cardBox(icon.metrics.shape, size) : { width: size, height: size }
    const step = index * gap
    const slide = group.offset ? (index * group.offsetAmount * unit) / 100 : 0

    width = Math.max(width, (horizontal ? step : slide) + box.width)
    height = Math.max(height, (horizontal ? slide : step) + box.height)

    if (index >= drawCount || !icon) continue
    // The glyph slides towards the exposed edge, but never off the card.
    const short = cardShortSide(icon.metrics.shape, size)
    const glyphSide = short * GLYPH_BASE * (icon.metrics.glyphScale / 100)
    const room = Math.max(0, (short - glyphSide) / 2)
    const shift = group.glyphOffset
      ? Math.min((group.glyphOffsetAmount / 100) * short, room)
      : 0
    slots.push({
      icon,
      x: horizontal ? step : slide,
      y: horizontal ? slide : step,
      width: box.width,
      height: box.height,
      size,
      rotation: group.rotate ? index * group.rotateAmount : 0,
      glyphDx: horizontal ? -shift : 0,
      glyphDy: horizontal ? 0 : -shift,
    })
  }

  // An empty deck still needs a box to sit in.
  const empty = slots.length === 0
  return { slots, width: empty ? unit : width, height: empty ? unit : height }
}
