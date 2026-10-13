import { hexToRgba } from '../color'
import { GLYPHS } from '../glyphs'
import {
  GLYPH_BASE,
  METAL_BANDS,
  cardBox,
  cardRadius,
  cardShortSide,
  type Gradient,
  type IconDef,
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

function gradientLayer(g: Gradient) {
  const alpha = Math.min(1, g.strength / 100) * 0.35
  const stop = `rgba(255,255,255,${alpha})`
  const x = 50 + g.offsetX
  const y = 50 + g.offsetY
  const fade = Math.max(10, Math.min(95, g.sizeY / 6))
  if (g.style === 'Radial') {
    return `radial-gradient(${g.sizeX}% ${g.sizeY}% at ${x}% ${y}%, ${stop} 0%, rgba(255,255,255,0) ${fade}%)`
  }
  if (g.style === 'Linear') {
    return `linear-gradient(${180 + g.offsetX}deg, ${stop} 0%, rgba(255,255,255,0) ${fade}%)`
  }
  return `conic-gradient(from ${g.offsetX * 3.6}deg at ${x}% ${y}%, ${stop} 0%, rgba(255,255,255,0) ${fade}%)`
}

export function Glyph({ icon, size, color }: { icon: IconDef; size: number; color: string }) {
  if (icon.artwork) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={icon.artwork.viewBox}
        color={color}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      >
        {icon.artwork.paths.map((path, i) => (
          <path
            key={i}
            d={path.d}
            fill={path.fill}
            stroke={path.stroke}
            strokeWidth={path.strokeWidth}
          />
        ))}
      </svg>
    )
  }
  const Lucide = GLYPHS[icon.glyph]
  return <Lucide size={size} color={color} strokeWidth={1.8} />
}

type Props = {
  icon: IconDef
  mode: Mode
  size: number
  className?: string
  /** Moves the glyph inside the card, which is how a deck keeps it in the exposed strip. */
  glyphShift?: { x: number; y: number }
}

export function IconCard({ icon, mode, size, className = '', glyphShift }: Props) {
  const a = icon[mode]
  const shape = icon.metrics.shape
  const box = cardBox(shape, size)
  const short = cardShortSide(shape, size)
  const ring = Math.max(1, short * 0.032)
  const radius = cardRadius(shape, icon.metrics.cornerRadius, size)
  const glyphSize = short * GLYPH_BASE * (icon.metrics.glyphScale / 100)
  const highlight = hexToRgba(a.highlight.color, a.highlight.opacity / 100)
  const blur = a.highlight.blur * (short / 72)
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
        className="relative"
        style={
          glyphShift && (glyphShift.x !== 0 || glyphShift.y !== 0)
            ? { transform: `translate(${glyphShift.x}px, ${glyphShift.y}px)` }
            : undefined
        }
      >
        <Glyph icon={icon} size={glyphSize} color={a.glyph} />
      </span>
    </div>
  )
}
