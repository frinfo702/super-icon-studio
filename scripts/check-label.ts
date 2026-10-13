import assert from 'node:assert'
import { DEFAULT_LABEL, labelBox, nextLabelId, type IconDef, type Label } from '../src/model.ts'

const label = (patch: Partial<Label> = {}): Label => ({ ...DEFAULT_LABEL, id: 'label-1', text: 'BETA', ...patch })
const square = { width: 100, height: 100 }

// A fresh component is centred across the card and sits low in it: its badge ends 9% of the
// short side above the bottom edge, which is where the build badge sat before it was a list.
const pill = labelBox(label(), square, 100)
assert.equal(pill.fontSize, 15, 'the font size is a share of the short side')
assert.equal(pill.cx, 50, 'a component with no offset is centred')
assert.equal(pill.cy, 80, 'a component with the default offset sits low')
assert.equal(pill.cy + pill.height / 2, 90.875, 'the badge keeps its distance from the bottom edge')

// The shape decides the corners: a pill rounds by half its own height, a square not at all,
// and a rounded badge by the share of its height the radius holds.
assert.equal(pill.radius, pill.height / 2, 'a pill is fully rounded')
assert.equal(labelBox(label({ shape: 'Square' }), square, 100).radius, 0, 'a square badge has square corners')
assert.equal(
  labelBox(label({ shape: 'Rounded', radius: 25 }), square, 100).radius,
  pill.height / 4,
  'a rounded badge takes its radius as a share of its own height',
)

// Size and place are shares of the short side, so a wide card keeps the badge in proportion.
const wide = labelBox(label({ x: 10 }), { width: 100, height: 75 }, 75)
assert.equal(wide.fontSize, pill.fontSize * 0.75, 'a short card shrinks the letters')
assert.equal(wide.cx, 50 + 7.5, 'the offset follows the short side, not the long one')
assert.equal(wide.cy, 37.5 + 22.5, 'the badge keeps its place on a card that is not square')

// A component's name is one neither appearance is already drawing.
const icon = (light: string[], dark: string[] = []): IconDef =>
  ({
    light: { labels: light.map((id) => label({ id })) },
    dark: { labels: dark.map((id) => label({ id })) },
  }) as unknown as IconDef

assert.equal(nextLabelId(icon([])), 'label-1', 'the first component is label-1')
assert.equal(nextLabelId(icon(['label-1', 'label-2'])), 'label-3', 'the next free name follows the list')
assert.equal(nextLabelId(icon(['label-2'], ['label-1'])), 'label-3', 'both appearances are taken into account')

console.log('components: all checks passed')
