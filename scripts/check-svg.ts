import assert from 'node:assert'
import { parseSvg } from '../src/svg.ts'

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

console.log('svg parser: all checks passed')
