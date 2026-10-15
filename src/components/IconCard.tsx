import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { hexToRgba, mixHex } from '../color'
import { GLYPHS } from '../glyphs'
import { ArtworkPoints } from './ArtworkPoints'
import {
  BLUEPRINT,
  GLASS,
  GLYPH_BASE,
  LABEL_PADDING,
  METAL_BANDS,
  PEEL,
  cardBox,
  cardRadius,
  cardShortSide,
  labelBox,
  labelRing,
  type Appearance,
  type Background,
  type Gradient,
  type IconDef,
  type Label,
  type Metrics,
  type Mode,
  type Texture,
} from '../model'

const BLEND: Record<string, string> = {
  'Soft light': 'soft-light',
}

/** A fine grain, so the metal reads as a surface rather than a gradient. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")"

function textureLayer(texture: Texture) {
  if (texture === 'None') return null
  const bands = METAL_BANDS.map(([offset, colour, alpha]) => `${hexToRgba(colour, alpha)} ${offset}`).join(', ')
  return [
    'radial-gradient(120% 100% at 22% 6%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 55%)',
    `conic-gradient(from 210deg at 50% 50%, ${bands})`,
    GRAIN,
  ].join(', ')
}

/**
 * The corner folded back: a quarter-ellipse anchored to the bottom-right corner, filled with
 * the underside of the card and casting its shadow across the card along the fold.
 */
function peelLayer(card: string, short: number) {
  const side = short * PEEL.size
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-0 right-0"
      style={{
        width: side,
        height: side,
        borderTopLeftRadius: '100% 100%',
        background: `linear-gradient(to bottom right, ${mixHex(card, '#FFFFFF', PEEL.lighten)}, ${mixHex(card, '#000000', PEEL.darken)})`,
        boxShadow: `-${short * 0.02}px -${short * 0.02}px ${short * 0.07}px rgba(0, 0, 0, 0.3)`,
      }}
    />
  )
}

/** The guides an app-icon template draws, as an overlay in the glyph colour. */
function guideLayer(background: Background, glyph: string) {
  if (background !== 'Grid' && background !== 'Blueprint') return null
  const { inset, radius, grid, circles, stroke, opacity } = BLUEPRINT
  const edge = 100 - inset

  return (
    <svg
      aria-hidden
      data-guide
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
      fill="none"
      stroke={glyph}
      strokeWidth={stroke}
      strokeOpacity={opacity}
    >
      {background === 'Blueprint' ? (
        <>
          <rect x={inset} y={inset} width={edge - inset} height={edge - inset} rx={radius} />
          {circles.map((r) => (
            <circle key={r} cx="50" cy="50" r={r} />
          ))}
          <path d={`M${inset} ${inset} L${edge} ${edge} M${edge} ${inset} L${inset} ${edge}`} />
        </>
      ) : null}
      {grid.map((v) => (
        <path key={v} d={`M${v} ${inset} L${v} ${edge} M${inset} ${v} L${edge} ${v}`} />
      ))}
    </svg>
  )
}

/**
 * What a badge sits on: nothing, a colour or a gradient of its own, or — when it inherits — the
 * card's own colour and finish, drawn into the badge so it reads as a piece of the card.
 */
function badgeBackground(label: Label, card: Appearance): CSSProperties | undefined {
  const alpha = label.opacity / 100
  if (label.background === 'None') return undefined
  if (label.background === 'Solid') return { backgroundColor: hexToRgba(label.fill, alpha) }
  if (label.background === 'Gradient') {
    return {
      backgroundImage: `linear-gradient(${label.angle}deg, ${hexToRgba(label.fill, alpha)}, ${hexToRgba(label.fillEnd, alpha)})`,
    }
  }
  return {
    backgroundColor: hexToRgba(card.card, alpha),
    backgroundImage: gradientLayer(card.gradient, alpha),
    backgroundBlendMode: BLEND[card.gradient.blend] ?? card.gradient.blend.toLowerCase(),
  }
}

/**
 * A component's badge: its line of text on the background it asks for, with the ring it draws.
 * Given a way to report a drag it can be moved on the card itself, which reports the same
 * offsets the inspector's rows hold.
 */
function LabelBadge({
  label,
  card,
  box,
  short,
  onMove,
}: {
  label: Label
  /** The appearance the card is drawn in, which is what a component that inherits picks up. */
  card: Appearance
  /** The card's own box, in the card's units. */
  box: { width: number; height: number }
  short: number
  onMove?: (id: string, x: number, y: number) => void
}) {
  const held = useRef<{ x: number; y: number; clientX: number; clientY: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const text = label.text.trim()

  const begin = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!onMove) return
    event.preventDefault()
    event.stopPropagation()
    // Capture keeps the drag alive outside the badge; it can refuse a pointer that is gone.
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // A pointer the browser no longer knows: the events still arrive at this element.
    }
    held.current = { x: label.x, y: label.y, clientX: event.clientX, clientY: event.clientY }
    setDragging(true)
  }

  const move = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const start = held.current
    if (!start || !onMove) return
    onMove(
      label.id,
      start.x + ((event.clientX - start.clientX) / short) * 100,
      start.y + ((event.clientY - start.clientY) / short) * 100,
    )
  }

  const end = () => {
    held.current = null
    setDragging(false)
  }

  if (!text) return null
  const { fontSize, height, radius, cx, cy } = labelBox(label, box, short)
  const ring = Math.max(1, height * 0.032)
  const highlight = labelRing(label, card)

  return (
    <span
      aria-hidden
      data-label={label.id}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      className={`absolute left-1/2 top-1/2 flex max-w-[92%] items-center justify-center overflow-hidden font-semibold ${
        onMove ? 'touch-none select-none' : 'pointer-events-none'
      }`}
      style={{
        height,
        paddingInline: fontSize * (LABEL_PADDING + 0.15),
        borderRadius: radius,
        ...badgeBackground(label, card),
        color: label.color,
        fontSize,
        letterSpacing: fontSize * 0.04,
        boxShadow: `inset 0 0 0 ${ring}px ${hexToRgba(highlight.color, highlight.opacity / 100)}`,
        transform: `translate(-50%, -50%) translate(${cx - box.width / 2}px, ${cy - box.height / 2}px)`,
        cursor: onMove ? (dragging ? 'grabbing' : 'grab') : undefined,
      }}
    >
      {text}
    </span>
  )
}

/** The stops of a CSS gradient, straight from the shared [offset, colour, alpha] table. */
const stops = (table: [string, string, number][]) =>
  table.map(([offset, colour, alpha]) => `${hexToRgba(colour, alpha)} ${offset}`).join(', ')

/**
 * The glass surface: a wash across the card and a light along its top edge running into a
 * shadow along its bottom one, drawn over whatever the card already carries.
 */
function glassLayer() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        borderRadius: 'inherit',
        backgroundImage: `linear-gradient(to bottom right, ${stops(GLASS.wash)}), linear-gradient(to bottom, ${stops(GLASS.edge)})`,
      }}
    />
  )
}

/** The card's own gradient — a light wash over its colour — as a CSS layer a badge can wear too. */
function gradientLayer(g: Gradient, fade = 1) {
  const alpha = Math.min(1, g.strength / 100) * 0.35 * fade


  const stop = `rgba(255,255,255,${alpha})`
  const x = 50 + g.offsetX
  const y = 50 + g.offsetY
  const reach = Math.max(10, Math.min(95, g.sizeY / 6))
  if (g.style === 'Radial') {
    return `radial-gradient(${g.sizeX}% ${g.sizeY}% at ${x}% ${y}%, ${stop} 0%, rgba(255,255,255,0) ${reach}%)`
  }
  if (g.style === 'Linear') {
    return `linear-gradient(${180 + g.offsetX}deg, ${stop} 0%, rgba(255,255,255,0) ${reach}%)`
  }
  return `conic-gradient(from ${g.offsetX * 3.6}deg at ${x}% ${y}%, ${stop} 0%, rgba(255,255,255,0) ${reach}%)`
}

export function Glyph({
  icon,
  size,
  color,
  filter,
}: {
  icon: IconDef
  size: number
  color: string
  filter?: string
}) {
  if (icon.artwork) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={icon.artwork.viewBox}
        style={filter ? { filter } : undefined}
        color={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        // The drawing is the file's own markup: whatever it is made of arrives as it was drawn.
        dangerouslySetInnerHTML={{ __html: icon.artwork.markup }}
      />
    )
  }
  const Lucide = GLYPHS[icon.glyph]
  return <Lucide size={size} color={color} strokeWidth={1.8} style={filter ? { filter } : undefined} />
}

type Props = {
  icon: IconDef
  mode: Mode
  size: number
  className?: string
  /** Moves the glyph inside the card, which is how a deck keeps it in the exposed strip. */
  glyphShift?: { x: number; y: number }
  /** Draws the point handles for an imported drawing, and reports what they are dragged to. */
  editing?: boolean
  onEditPoint?: (pathIndex: number, pointIndex: number, x: number, y: number) => void
  onEditMetrics?: (patch: Partial<Metrics>) => void
  /** Lets the components be dragged on the card, which is how their place is dialled in. */
  onMoveLabel?: (id: string, x: number, y: number) => void
}

export function IconCard({
  icon,
  mode,
  size,
  className = '',
  glyphShift,
  editing = false,
  onEditPoint,
  onEditMetrics,
  onMoveLabel,
}: Props) {
  const a = icon[mode]
  const shape = icon.metrics.shape
  const box = cardBox(shape, size)
  const short = cardShortSide(shape, size)
  const ring = Math.max(1, short * 0.032)
  const radius = cardRadius(shape, icon.metrics.cornerRadius, size)
  const glyphSize = short * GLYPH_BASE * (icon.metrics.glyphScale / 100)
  const highlight = hexToRgba(a.highlight.color, a.highlight.opacity / 100)
  const blur = a.highlight.blur * (short / 72)
  const offset = icon.metrics.glyphOffset
  const shift = {
    x: (glyphShift?.x ?? 0) + (short * offset.x) / 100,
    y: (glyphShift?.y ?? 0) + (short * offset.y) / 100,
  }
  const peel = icon.metrics.peel ? peelLayer(a.card, short) : null
  const guides = guideLayer(a.background, a.glyph)
  const glass = a.background === 'Liquid glass' ? glassLayer() : null
  // Glass lets the card show through the glyph and gives it a rim light and a float shadow.
  const glyphFilter = a.glyphGlass
    ? `opacity(${GLASS.glyphOpacity}) drop-shadow(0 ${GLASS.glyphRim.dy * (short / 72)}px ${GLASS.glyphRim.blur * (short / 72)}px ${hexToRgba('#FFFFFF', GLASS.glyphRim.opacity)}) drop-shadow(0 ${GLASS.glyphShadow.dy * (short / 72)}px ${GLASS.glyphShadow.blur * (short / 72)}px ${hexToRgba('#000000', GLASS.glyphShadow.opacity)})`
    : undefined
  const labels = a.labels.map((label) => (
    <LabelBadge key={label.id} label={label} card={a} box={box} short={short} onMove={onMoveLabel} />
  ))
  const texture = textureLayer(a.texture)

  return (
    <div
      data-icon={icon.id}
      className={`relative grid shrink-0 place-items-center overflow-hidden ${className}`}
      style={{
        width: box.width,
        height: box.height,
        borderRadius: `${radius}px`,
        backgroundColor: a.card,
        backgroundImage: gradientLayer(a.gradient),
        backgroundBlendMode: BLEND[a.gradient.blend] ?? a.gradient.blend.toLowerCase(),
        boxShadow: [
          `0 0 0 ${ring}px ${highlight}`,
          `0 0 0 ${ring + 0.75}px rgba(0, 0, 0, 0.07)`,
          blur > 0 ? `0 0 ${blur}px ${blur / 2}px ${highlight}` : null,
          `0 ${short * 0.045}px ${short * 0.09}px rgba(0, 0, 0, ${short > 40 ? 0.16 : 0.1})`,
          `inset 0 0 ${Math.max(1, short * 0.04)}px rgba(0, 0, 0, 0.07)`,
        ]
          .filter(Boolean)
          .join(', '),
      }}
    >
      {guides}
      {glass}
      {texture ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: texture,
            backgroundBlendMode: 'normal, normal, soft-light',
            mixBlendMode: 'overlay',
            filter: `blur(${Math.max(0.5, short * 0.03)}px)`,
          }}
        />
      ) : null}
      <span
        className="relative grid place-items-center"
        style={{ width: glyphSize, height: glyphSize, transform: `translate(${shift.x}px, ${shift.y}px)` }}
      >
        <Glyph icon={icon} size={glyphSize} color={a.glyph} filter={glyphFilter} />
        {editing && icon.artwork?.paths && onEditPoint && onEditMetrics ? (
          <ArtworkPoints
            artwork={icon.artwork}
            box={glyphSize}
            short={short}
            card={{ width: box.width, height: box.height, radius }}
            metrics={icon.metrics}
            onPoint={onEditPoint}
            onMetrics={onEditMetrics}
          />
        ) : null}
      </span>
      {peel}
      {labels}
    </div>
  )
}
