/**
 * Just enough SVG path understanding to drag an artwork's anchor points: each command set is
 * parsed down to the character offsets its numbers came from, so a drag rewrites those
 * numbers and leaves the rest of the path — curves it does not model, odd commands, spacing —
 * byte for byte as it was.
 */

type Slot = { value: number; start: number; end: number }

/** One anchor point of the drawing: where it sits, and which set it belongs to. */
export type PathPoint = { index: number; x: number; y: number }

const TOKEN = /[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g
const ARITY: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 }
const NONE = { x: -1, y: -1, hx: -1, hy: -1 }

/** Which number of a set holds the anchor, and which one holds the handle that follows it. */
const SLOTS: Record<string, { x: number; y: number; hx: number; hy: number }> = {
  M: { x: 0, y: 1, hx: -1, hy: -1 },
  L: { x: 0, y: 1, hx: -1, hy: -1 },
  T: { x: 0, y: 1, hx: -1, hy: -1 },
  H: { x: 0, y: -1, hx: -1, hy: -1 },
  V: { x: -1, y: 0, hx: -1, hy: -1 },
  C: { x: 4, y: 5, hx: 2, hy: 3 },
  S: { x: 2, y: 3, hx: 0, hy: 1 },
  Q: { x: 2, y: 3, hx: 0, hy: 1 },
  A: { x: 5, y: 6, hx: -1, hy: -1 },
}

type Set = {
  letter: string
  relative: boolean
  numbers: Slot[]
  /** Where the command starts from: offsets are measured against it. */
  from: { x: number; y: number }
  /** Where the anchor ends up. */
  at: { x: number; y: number }
  slots: { x: number; y: number; hx: number; hy: number }
  subpath: number
}

/** Every coordinate a renderer reads from the set, so a whole set can be shifted. */
function coordinates(set: Set) {
  const pairs: { slot: Slot; axis: 'x' | 'y' }[] = []
  if (set.letter === 'A') {
    // An arc's radii, rotation and flags are never written as offsets: only its end moves.
    if (set.slots.x >= 0) pairs.push({ slot: set.numbers[set.slots.x], axis: 'x' })
    if (set.slots.y >= 0) pairs.push({ slot: set.numbers[set.slots.y], axis: 'y' })
    return pairs
  }
  set.numbers.forEach((slot, index) => {
    if (set.letter === 'H') return pairs.push({ slot, axis: 'x' })
    if (set.letter === 'V') return pairs.push({ slot, axis: 'y' })
    pairs.push({ slot, axis: index % 2 ? 'y' : 'x' })
  })
  return pairs
}

function sets(d: string): Set[] {
  const found: Set[] = []
  let command = ''
  let queue: Slot[] = []
  let cursor = { x: 0, y: 0 }
  let subpathStart = { x: 0, y: 0 }
  let subpath = 0

  const emit = () => {
    const arity = ARITY[command.toLowerCase()]
    if (!arity) return
    const upper = command.toUpperCase()
    const relative = command === command.toLowerCase()
    const slots = SLOTS[upper]
    const first = found.length === 0 || found[found.length - 1].subpath !== subpath
    while (queue.length >= arity) {
      const numbers = queue.splice(0, arity)
      const read = (index: number, axis: 'x' | 'y') =>
        index < 0 ? cursor[axis] : relative ? cursor[axis] + numbers[index].value : numbers[index].value
      const at = { x: read(slots.x, 'x'), y: read(slots.y, 'y') }
      found.push({ letter: upper, relative, numbers, from: { ...cursor }, at, slots, subpath })
      // A moveto's first pair starts the subpath; the pairs after it are plain lines.
      if (upper === 'M' && first) subpathStart = { ...at }
      cursor = at
    }
  }

  for (const token of d.matchAll(TOKEN)) {
    const text = token[0]
    if (/[A-Za-z]/.test(text)) {
      command = text
      queue = []
      if (command.toLowerCase() === 'm' || command.toLowerCase() === 'z') subpath += 1
      if (command.toLowerCase() === 'z') {
        cursor = { ...subpathStart }
        found.push({ letter: 'Z', relative: false, numbers: [], from: { ...cursor }, at: { ...cursor }, slots: NONE, subpath })
      }
      continue
    }
    queue.push({ value: Number(text), start: token.index, end: token.index + text.length })
    emit()
  }
  return found
}

/** Where every anchor of the path sits, in the path's own coordinates. */
export function pathPoints(d: string): PathPoint[] {
  return sets(d)
    .map((set, index) => ({ index, x: set.at.x, y: set.at.y, letter: set.letter }))
    .filter((point) => point.letter !== 'Z')
    .map(({ index, x, y }) => ({ index, x, y }))
}

/**
 * Puts one anchor at `x`, `y`, taking the handles that belong to it along so the curves either
 * side keep their shape. Offsets stay offsets, and a following set that measures itself from
 * this anchor is shifted back to stay where it is.
 */
export function movePathPoint(d: string, index: number, x: number, y: number): string {
  const list = sets(d)
  const set = list[index]
  if (!set || set.letter === 'Z') return d
  const dx = x - set.at.x
  const dy = y - set.at.y
  if (!dx && !dy) return d

  const edits: { start: number; end: number; value: number }[] = []
  const write = (slot: Slot, value: number) => edits.push({ start: slot.start, end: slot.end, value })

  if (set.slots.x >= 0) write(set.numbers[set.slots.x], set.relative ? x - set.from.x : x)
  if (set.slots.y >= 0) write(set.numbers[set.slots.y], set.relative ? y - set.from.y : y)
  for (const [slot, delta] of [
    [set.slots.hx, dx],
    [set.slots.hy, dy],
  ] as [number, number][]) {
    if (slot >= 0) write(set.numbers[slot], set.numbers[slot].value + delta)
  }

  // The handle arriving at this anchor lives on the set before it, inside the same subpath.
  const previous = list[index - 1]
  if (previous && previous.subpath === set.subpath && previous.slots.hx >= 0) {
    write(previous.numbers[previous.slots.hx], previous.numbers[previous.slots.hx].value + dx)
    write(previous.numbers[previous.slots.hy], previous.numbers[previous.slots.hy].value + dy)
  }

  // A following set measures itself from this anchor, unless a Z in between reset the cursor:
  // only a moved subpath start carries that one along.
  const rest = list.slice(index + 1)
  const next = rest.find((candidate) => candidate.letter !== 'Z')
  const crossedClose = rest[0]?.letter === 'Z'
  if (next?.relative && (!crossedClose || set.letter === 'M')) {
    for (const { slot, axis } of coordinates(next)) {
      write(slot, slot.value - (axis === 'x' ? dx : dy))
    }
  }

  return edits
    .sort((a, b) => b.start - a.start)
    .reduce((out, edit) => `${out.slice(0, edit.start)}${Number(edit.value.toFixed(4))}${out.slice(edit.end)}`, d)
}
