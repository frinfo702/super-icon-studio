import assert from 'node:assert'
import type { Artwork } from '../src/model.ts'
import {
  hasOwnColours,
  mergeColours,
  parseSvg,
  plainPaths,
  serializeSvg,
  tameReference,
  tameStyle,
  withPaths,
} from '../src/svg.ts'

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

// A drawing of plain paths — a group at most, no attributes of its own on them — is the part
// the point editor can change, and the wrapper's presentation attributes come through.
const flat = plainPaths(
  '<g data-artwork="artwork-a" fill="none" stroke="currentColor" stroke-width="2"><path d="M0 0h1"/><path d="M1 1h1" fill="#ff0000"/></g>',
)
assert.equal(flat?.[0].fill, 'none')
assert.equal(flat?.[0].stroke, 'currentColor')
assert.equal(flat?.[0].strokeWidth, 2)
assert.equal(flat?.[1].fill, '#ff0000')

// Groups, transforms, shapes, stylesheets and attributes an editor cannot carry have no editor.
assert.equal(plainPaths('<g data-artwork="a"><g transform="translate(1 1)"><path d="M0 0h1"/></g></g>'), undefined)
assert.equal(plainPaths('<g data-artwork="a"><rect width="4" height="4"/></g>'), undefined)
assert.equal(plainPaths('<g data-artwork="a"><style>.a{fill:red}</style><path class="a" d="M0 0h1"/></g>'), undefined)
assert.equal(plainPaths('<g data-artwork="a"><path d="M0 0h1" opacity="0.4"/></g>'), undefined)

const artwork = (markup: string): Artwork => ({
  file: 'a.svg',
  viewBox: '0 0 24 24',
  markup,
  paths: plainPaths(markup),
})

// An import keeps the drawing's own colours, so a two-colour icon arrives as it was drawn.
const coloured = artwork(
  '<g data-artwork="a"><path d="M0 0h1" fill="#ff0000"/><path d="M1 1h1" fill="none" stroke="#0000ff"/><path d="M2 2h1" fill="url(#grad)"/></g>',
)
assert.equal(hasOwnColours(coloured), true)

// Merging is the separate step that draws them all in the glyph colour, and it is idempotent.
const merged = mergeColours(coloured)
assert.equal(merged.paths?.[0].fill, 'currentColor')
assert.equal(merged.paths?.[1].stroke, 'currentColor')
assert.equal(merged.paths?.[1].fill, 'none')
assert.equal(merged.paths?.[2].fill, 'url(#grad)')
assert.equal(hasOwnColours(merged), false)
assert.deepEqual(mergeColours(merged).paths, merged.paths)

// Artwork already in the glyph colour has nothing to merge.
assert.equal(
  hasOwnColours(artwork('<g data-artwork="a" fill="none" stroke="currentColor"><path d="M0 0h1"/></g>')),
  false,
)

// A stylesheet's colours are drawn in the glyph colour too, and its other rules stay put.
const styled = mergeColours(
  artwork(
    '<g data-artwork="a"><style>.st0{fill:#FF0000;stroke-width:2}</style><path class="st0" d="M0 0h1" style="stroke:#00ff00"/></g>',
  ),
)
assert.equal(styled.markup.includes('fill:currentColor'), true)
assert.equal(styled.markup.includes('stroke-width:2'), true)
assert.equal(styled.markup.includes('stroke:currentColor'), true)

// An editor's edit redraws the drawing and keeps the wrapper the drawing came in.
const edited = withPaths(coloured, [
  { d: 'M0 0h2', fill: 'currentColor', stroke: 'none', strokeWidth: 1.8 },
])
assert.equal(edited.markup.startsWith('<g data-artwork="a">'), true)
assert.equal(edited.markup.includes('d="M0 0h2"'), true)

// The file holds the drawing's own markup under the box the app fitted it to.
assert.equal(
  serializeSvg(edited).startsWith(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g data-artwork="a">',
  ),
  true,
)

// A stylesheet only reaches inside the file it came with.
assert.equal(tameStyle('@import url("https://evil/x.css");.a{fill:red}'), '.a{fill:red}')
assert.equal(
  tameStyle('.a{fill:url(#grad)}.b{background:url(https://evil/x.png)}'),
  '.a{fill:url(#grad)}.b{background:none}',
)

// So does an element's own reference to a paint server, a clip or a filter.
assert.equal(tameReference('url(#grad)'), 'url(#grad)')
assert.equal(tameReference('url(https://evil/x.svg#a) red'), 'red')
assert.equal(tameReference('url( "https://evil/x.svg#a" )'), '')
assert.equal(tameReference('none'), 'none')

console.log('svg parser: all checks passed')
