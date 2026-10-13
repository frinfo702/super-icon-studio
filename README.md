# Super Icon Studio

A web version of the icon design tool Hector Simpson (@dizzyup) showed off in
[this post](https://x.com/dizzyup/status/2087543392859193368): an icon catalogue, a design
surface for tuning card colour, gradient, highlight and metrics across light and dark
appearances, and a composer that arranges several icons into one deck.

## Running it

```sh
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # type-check + production bundle
pnpm lint     # oxlint
pnpm check    # asserts for the SVG importer and the deck layout
```

## The icon library is a folder

The icon set lives in `icons/` at the root: `catalogue.json` holds the design values (name,
identifier, colours, metrics, finish) and one `.svg` per icon holds its artwork. The Vite
dev server serves and writes that folder through `/api/library`, so the app reads it on
start and writes it back when you press Save.

- **Start** — every `.svg` in the folder comes back as artwork, and an `.svg` that nothing
  in `catalogue.json` claims becomes a new icon, named after its file.
- **Save** — writes `catalogue.json`, writes one file per icon that has artwork, and
  deletes artwork files the catalogue no longer refers to. Files the app never wrote are
  left alone.
- **Import** — `Import SVG…` in the Library inspector names the file after the icon's
  identifier, trims it, and re-points its colours at the glyph colour. It reaches the folder
  on the next Save, and Revert drops it.
- The folder wins over the catalogue for artwork, so editing an `.svg` by hand — or dropping
  one in — is picked up on the next load.
- The folder is tracked, artwork included, so a build and a deploy carry the same set.

`pnpm dev` and `pnpm preview` both serve this. A build also writes a snapshot of the folder
to `icons.json`, so a static build with no middleware behind it still opens with the icon set
you saved; with no snapshot either, it falls back to the catalogue bundled in
`src/data/icons.ts`.

## Deploying

```sh
pnpm build
wrangler deploy   # wrangler.jsonc serves dist as static assets
```

With no middleware in front of it, the deployed app keeps the set in the browser's
`localStorage` instead of the folder: the build's `icons.json` seeds a first visit, and Save
from then on writes to that browser. Rebuild and redeploy to change what a new visitor
starts from.

## Studio

The left sidebar holds two sections.

**Library** — the catalogue as a grid. Selecting an icon fills the inspector: rename it,
change its identifier and import an SVG of your own. The `+` button adds an icon, the trash
deletes one, the download button in the toolbar writes the selected icon out as an SVG, and
the app-icon button writes it on a 512 × 512 canvas — the artwork at the ~80% coverage a
macOS icon uses, which is what Apple's Icon Composer wants to open. Edits mark the catalogue
as `Unsaved`; Revert restores the last saved state and Save commits it.

**Design** — a hero preview of the selected icon, with the size ladder under it. The
inspector has four panels: **Size** (size preset, shape, glyph scale, corner radius),
**Gradient** (strength, style, blend mode, offsets, size), **Highlight** (colour, opacity,
blend mode, blur), and **Card** (card and glyph colours, background, texture). Gradient,
Highlight, Card and texture are stored per appearance, so light and dark are tuned
separately; the sun/moon switch in the toolbar swaps between them for the whole window.

**Background** draws under the card's colour: Plain, Grid, or Blueprint, the grid and
construction circles an app-icon template shows — in the glyph's colour, so the drawing
reads on any card — or Liquid glass, a wash over the card with a light along its top edge and
a shadow along its bottom one. Whichever you pick exports with the icon.

**Glass glyph**, next to the texture, gives the glyph the other half of that material: the
card shows through it, with a rim light along its top and a shadow under it, so it sits in
the surface rather than on it.

**Shape** takes the card beyond the square: Square, Wide (4:3), Tall (3:4) and Circle. A
card keeps its corner radius, glyph and highlight ring in proportion to its short side, and
Circle rounds fully, which is why the corner radius slider steps aside for it.

**Texture** adds a material to the card. `Liquid metal` lays chrome banding, a specular
sweep and a fine grain over the base colour, all built from one table of bands in
`src/model.ts` so the renderer and the exporter cannot drift apart.

The size ladder comes from a **preset** — Interface, macOS app, iOS app, watchOS app, or
Web & favicon — so the strip shows the sizes that platform actually ships. Selecting a size
makes it the master, which is the size the hero previews and the SVG exports at. Sizes too
large to sit on the canvas at 1:1 (512, 1024) are listed as chips rather than drawn, and the
hero's zoom is clamped so a 1024pt icon cannot paint across the whole canvas.

**Reset to Defaults** at the foot of the Design inspector puts the glyph scale, corner
radius, gradient and highlight back to where they start. Card and glyph colours stay, since
those are the icon's identity rather than a number that drifted.

## Composer

Studio/Composer in the toolbar switches to the deck composer. The sidebar lists the layers
front to back with reorder, remove and add controls, over a depth slider that says how many
of them draw. The canvas previews the deck at size, animates the entrance, and shows the
deck in context as tab items. The inspector has **Layout** (direction, automatic or manual
gap, scale, rotate, cross-axis offset, reserve empty slots, glyph offset) and **Animation**
(duration, stagger, easing) panels.

`src/group.ts` owns the arrangement: each layer steps along the axis by the gap, shrinks by
the scale amount, leans by the rotate amount and slides by the offset amount, while the
glyph inside each card moves the other way so it stays in the exposed strip. Empty slots
keep their footprint when `Reserve empty slots` is on, so the deck holds its width as the
depth changes. The maths is covered by `scripts/check-group.ts`.

## How icons render

`src/components/IconCard.tsx` draws a card from its appearance: the base colour, a radial
or linear or conic gradient layer blended over it, a highlight ring around the edge, an
inset vignette, and a drop shadow. Everything scales from the requested size, so the 12pt
and 48pt tiles in the ladder are the same code path as the hero preview.

Anything that draws a frame around an icon goes through `src/components/IconFrame.tsx`,
which sizes the frame from the icon's own reach — the highlight ring plus the drop shadow —
so a card can never paint over the frame that marks it as selected.

Glyphs come from [Lucide](https://lucide.dev) by name (`src/glyphs.ts`), or from an SVG you
import. `src/svg.ts` reads `<path>` elements and their `d`/`fill`/`stroke`/`stroke-width`
attributes, taking presentation attributes from the `<svg>` tag as defaults; shapes, groups
and transforms are ignored. Imported artwork is then trimmed: it is measured through
`getBBox()`, fitted to a square box centred on its own bounds, and scaled so its longest
side fills 83% of that box — the same share a bundled glyph fills, so imported and built-in
icons carry the same optical weight.

## Export

The toolbar's download button writes a standalone SVG of the selected icon in the current
appearance: the highlight ring, the card, the finish gradient, the material and the glyph,
with the drop shadow as an SVG filter. The gradient geometry is carried across exactly (SVG
has no conic gradient, so an Angular finish exports as the radial equivalent, and the metal
banding as a linear one). The glyph is cloned out of the live page, so the file matches what
is on screen, and a wide or tall card exports at its own aspect ratio.

## Not built

The **Package** section from the video: the staged-change list and the release flow that
ships the Swift package. Everything else from the tour is here.

Two details are inferred, because the video never shows them: the **Animation** panel in the
Composer, which the video scrolls past, and the Design inspector's **Card** panel, which
holds only the base colour. The sliders inside each Layout row were also never opened, so
the ones under Scale, Rotate and Glyph offset are guesses at the ranges the original uses.

## native/

A first pass at the same app as a SwiftUI package, from before we settled on the web build.
It builds and runs (`cd native && swift run SuperIconStudio`) and covers the Library and
Design sections. It is a dead end we agreed not to pursue; delete the folder if you do not
want it around.
