import assert from 'node:assert'
import { hasOwnColours, mergeColours, parseArtwork, parseSvg } from '../src/svg.ts'

// A filled icon: no fill or stroke anywhere, so the glyph colour fills the path.
const filled = parseSvg('<svg viewBox="0 0 32 32"><path d="M4 4h24v24H4z"/></svg>')
assert.equal(filled?.viewBox, '0 0 32 32')
assert.equal(filled?.paths[0].fill, 'currentColor')
assert.equal(filled?.paths[0].stroke, 'none')

// A stroked icon in the lucide style: presentation attributes live on the <svg> tag.
const stroked = parseSvg(
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1 L2 2"/></svg>',
)
assert.equal(stroked?.paths[0].fill, 'none')
assert.equal(stroked?.paths[0].stroke, 'currentColor')
assert.equal(stroked?.paths[0].strokeWidth, 2)

// Per-path attributes win over the root.
const mixed = parseSvg(
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M0 0h1" fill="#ff0000" stroke-width="3"/></svg>',
)
assert.equal(mixed?.paths[0].fill, '#ff0000')
assert.equal(mixed?.paths[0].strokeWidth, 3)

// Shapes and empty files produce nothing to render.
assert.equal(parseSvg('<svg><rect width="4" height="4"/></svg>'), null)
assert.equal(parseSvg('<svg></svg>'), null)

// An import keeps the drawing's own colours, so a two-colour icon arrives as it was drawn.
const twoColour = parseArtwork(
  '<svg viewBox="0 0 24 24"><path d="M0 0h1" fill="#ff0000"/><path d="M1 1h1" fill="none" stroke="#0000ff"/></svg>',
  'two.svg',
  { trim: false },
)
assert.equal(twoColour?.paths[0].fill, '#ff0000')
assert.equal(twoColour?.paths[1].stroke, '#0000ff')
assert.equal(hasOwnColours(twoColour!.paths), true)

// Merging is the separate step that draws them all in the glyph colour, and it is idempotent.
const merged = mergeColours(twoColour!)
assert.equal(merged.paths[0].fill, 'currentColor')
assert.equal(merged.paths[1].stroke, 'currentColor')
assert.equal(merged.paths[1].fill, 'none')
assert.equal(hasOwnColours(merged.paths), false)
assert.deepEqual(mergeColours(merged).paths, merged.paths)

// Artwork already in the glyph colour has nothing to merge.
assert.equal(hasOwnColours([{ d: 'M0 0h1', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }]), false)

console.log('svg parser: all checks passed')
