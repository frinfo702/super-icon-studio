import { IconCard } from './IconCard'
import { cardShortSide, type IconDef, type Mode } from '../model'

/**
 * How far the card's finish reaches past its own box: the highlight ring, plus room for
 * the drop shadow. Anything that draws a frame around an icon sizes it with this so the
 * card can never paint over the frame.
 */
function frameInset(size: number) {
  const ring = Math.max(1, size * 0.032)
  return Math.ceil(ring + size * 0.045 + 2)
}

type Props = {
  icon: IconDef
  mode: Mode
  size: number
  selected?: boolean
}

export function IconFrame({ icon, mode, size, selected = false }: Props) {
  const box = size + frameInset(cardShortSide(icon.metrics.shape, size)) * 2

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-[10px] ${
        selected ? 'ring-2 ring-[var(--accent)]' : ''
      }`}
      style={{ width: box, height: box }}
    >
      <IconCard icon={icon} mode={mode} size={size} />
    </span>
  )
}
