import assert from 'node:assert'
import { DEFAULT_GROUP, layoutGroup } from '../src/group.ts'
import { cardRadius, type IconDef, type Mode } from '../src/model.ts'

// Only the geometry inputs matter here, so the icons are stubs.
const stub = { id: 'x', metrics: { glyphScale: 125, cornerRadius: 30 }, mode: 'light' as Mode }
const icons = ['a', 'b', 'c', 'd'].map((id) => ({ ...stub, id })) as unknown as IconDef[]

const deck = { ...DEFAULT_GROUP, layers: ['a', 'b', 'c', 'd'], depth: 4 }
const unit = 100

const full = layoutGroup(deck, icons, unit)
assert.equal(full.slots.length, 4, 'every layer within the depth draws')
assert.equal(full.slots[0].x, 0, 'the front layer sits at the origin')
assert.ok(full.slots[1].x > full.slots[0].x, 'layers step along the layout axis')
assert.ok(full.slots[1].size < full.slots[0].size, 'layers shrink as they recede')
assert.ok(full.slots[0].glyphDx < 0, 'glyphs lean towards the exposed edge')
const room = (unit - unit * 0.44 * 1.25) / 2
assert.ok(full.slots[0].glyphDx >= -room, 'a glyph never slides off its own card')

const shallow = layoutGroup({ ...deck, depth: 2 }, icons, unit)
assert.equal(shallow.slots.length, 2, 'the depth decides how many layers draw')
assert.ok(shallow.width < full.width, 'dropping layers shrinks the deck')

const reserved = layoutGroup({ ...deck, depth: 2, reserveSlots: true }, icons, unit)
assert.equal(reserved.slots.length, 2, 'reserved slots are space, not layers')
assert.equal(reserved.width, full.width, 'reserved slots keep the footprint')

const vertical = layoutGroup({ ...deck, layout: 'Vertical' }, icons, unit)
assert.ok(vertical.slots[1].y > vertical.slots[0].y, 'vertical stacks down the canvas')
assert.equal(vertical.slots[0].x, 0, 'vertical leaves the cross axis alone at zero offset')
assert.ok(vertical.slots[0].glyphDy < 0 && vertical.slots[0].glyphDx === 0, 'vertical leans glyphs up')

const slid = layoutGroup({ ...deck, offsetAmount: 20 }, icons, unit)
assert.ok(slid.slots[1].y > slid.slots[0].y, 'the offset slides layers across the axis')

const plain = layoutGroup({ ...deck, scale: false, rotate: false, glyphOffset: false }, icons, unit)
assert.ok(
  plain.slots.every((slot) => slot.size === unit && slot.rotation === 0 && slot.glyphDx === 0),
  'the toggles each switch their effect off'
)

const tight = layoutGroup({ ...deck, autoGap: false, gap: 0 }, icons, unit)
assert.ok(tight.slots.every((slot) => slot.x === 0), 'a manual gap of zero stacks the layers')

// Wide cards are shorter than they are broad, and the deck measures their real box.
const wide = icons.map((icon) => ({ ...icon, metrics: { ...icon.metrics, shape: 'Wide' } })) as unknown as IconDef[]
const wideDeck = layoutGroup(deck, wide, unit)
assert.equal(wideDeck.slots[0].width, unit, 'a wide card keeps the requested width')
assert.equal(wideDeck.slots[0].height, unit * 0.75, 'a wide card is shorter than it is broad')
assert.ok(wideDeck.height < layoutGroup(deck, icons, unit).height, 'the deck is only as tall as its cards')

const circle = icons.map((icon) => ({
  ...icon,
  metrics: { ...icon.metrics, shape: 'Circle', cornerRadius: 30 },
})) as unknown as IconDef[]
const circleDeck = layoutGroup(deck, circle, unit)
assert.equal(circleDeck.slots[0].height, unit, 'a circle stays square')

// A circle ignores the corner radius setting; every other shape uses it.
assert.equal(cardRadius('Circle', 10, 100), 50, 'a circle is fully rounded')
assert.equal(cardRadius('Square', 30, 100), 30, 'a square takes the corner radius as a share of its side')
assert.equal(cardRadius('Wide', 30, 100), 22.5, 'a wide card rounds against its short side')

console.log('group layout: all checks passed')
