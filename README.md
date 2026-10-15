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
pnpm check    # asserts for the SVG importer, the deck layout, the path editor, the components and the undo history
```

## The icon library is a folder

The icon set lives in `icons/` at the root: `catalogue.json` holds the design values (name,
identifier, colours, metrics, finish) and one `.svg` per icon holds its artwork. The Vite
dev server serves and writes that folder through `/api/library`, so the app reads it on
start and writes every edit back on its own.

- **Start** — every `.svg` in the folder comes back as artwork, and an `.svg` that nothing
  in `catalogue.json` claims becomes a new icon, named after its file.
- **Save** — every settled edit writes itself: `catalogue.json`, one file per icon that has
  artwork, and the artwork files the catalogue no longer refers to are deleted. Files the app
  never wrote are left alone. The write waits for the edit to stop, so a drag on a slider
  lands as one save rather than one per frame.
- **Undo** — the toolbar's back and forward buttons step through the edits. A step covers a
  whole gesture, and an edit made after a step back replaces what forward was holding.
- **Import** — `Import SVG…` in the Library inspector names the file after the icon's
  identifier, fits it to the card, and keeps the drawing as it arrived: shapes, groups,
  transforms, stylesheets, gradients and clip paths all come through, with their own colours.
  A file too large for the set to carry beside the rest (over 256 KB) is refused rather than
  saved and lost. `Merge to one colour` beside it is the step that draws every layer in the
  glyph colour instead, which is what lets the light and dark appearances tint the drawing.
  Either way the file reaches the folder on the next save, and a step back drops it.
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
`localStorage` instead of the folder: the build's `icons.json` seeds a first visit, and every
edit from then on writes itself into that browser. Rebuild and redeploy to change what a new
visitor starts from.

## Studio

The left sidebar holds two sections.

**Library** — the catalogue as a grid. Selecting an icon fills the inspector: rename it,
change its identifier and import an SVG of your own. The `+` button adds an icon and the
trash deletes one. The toolbar's export buttons write the selected icon out: as an SVG, on a
512 × 512 canvas for Icon Composer — the artwork at the ~80% coverage a macOS icon uses — or
as the layers it is built from — the card, the glyph over it and one file per component — all
on the same 512 × 512 canvas, so a tool that stacks them in order rebuilds the same icon.
Edits save as they settle, and the sidebar shows `Saving` until the folder has them; the
toolbar's back and forward buttons step through the edits.

**Design** — a hero preview of the selected icon, with the size ladder under it. The
inspector has four panels: **Size** (size preset, shape, glyph scale, corner radius, peeled
corner), **Gradient** (strength, style, blend mode, offsets, size), **Highlight** (colour,
opacity, blend mode, blur), and **Card** (card and glyph colours, background, texture).
Gradient, Highlight, Card and texture are stored per appearance, so light and dark are tuned
separately; the sun/moon switch in the toolbar swaps between them for the whole window. The
`+` beside the panels adds a component to the icon, and each component gets a panel of its
own next to the four.

**Background** draws under the card's colour: Plain, Grid, or Blueprint, the grid and
construction circles an app-icon template shows — in the glyph's colour, so the drawing
reads on any card — or Liquid glass, a wash over the card with a light along its top edge and
a shadow along its bottom one. Whichever you pick exports with the icon.

**Glass glyph**, next to the texture, gives the glyph the other half of that material: the
card shows through it, with a rim light along its top and a shadow under it, so it sits in
the surface rather than on it.

**Peeled corner** folds the bottom-right corner back and shows the card's underside, with the
fold's shadow across the card. Like the shape and the corner radius it is set once, not per
appearance, and it exports with the icon.

**Editing an imported drawing** — a drawing that is nothing but plain paths gets a points
button in the toolbar. It lays the drawing's anchors over the card: dragging one bends the
shape, dragging the drawing itself moves it in the card, and the corner handles size it. A
shape edit is written into the path, so it saves and exports with the icon; the move and the
size are metrics, stored with the rest of the icon's settings. A drawing built from groups,
transforms, shapes or a stylesheet has no editor — there is no way to redraw it from its
anchors that would keep what it holds — so it is imported and drawn as it is.

**Components** are the pieces drawn over the card. The `+` beside the panels adds a text
component — a line of text in a badge, the badge a build reads — and the component's tab
holds everything about it: the text, the font size, the text colour, what the badge sits on,
its highlight, the shape (Pill, Rounded with a corner radius, or Square), and its place. Size
and place are shares of the card's short side, so one component reads the same at 16 points
and at 512. A component can be dragged about the hero preview instead of dialled in, and the
drag reports the same offsets the X and Y rows hold; `Remove component` takes it off the icon.
A new component lands in both appearances at once and then takes their colours separately, so
light and dark draw the same set of them. Components export as real elements: a tool that
opens the SVG needs a font from the stack, so outline the text there if it has to travel.

A component's **Background** is a choice of four: `None` for letters with nothing under them,
`Solid` for one fill colour, `Gradient` for two colours and the angle they run at, and
`Inherit`, where the badge takes the card's own colour and finish and needs no colours of its
own — the card keeps a component that follows it in step across both appearances. Solid,
gradient and inherited backgrounds all carry an opacity, so a badge can sit half into the card
rather than on top of it. The **Highlight** is the ring around the badge: either the two
values a component holds itself, or the card's highlight, which is how a component reads as
part of the card rather than a sticker on it.

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
and 48pt tiles in the ladder are the same code path as the hero preview. Its components draw
in the same card units, so a badge sits where the same share of the short side puts it
whatever the size; `labelBox` in `src/model.ts` works that box out, and the preview and the
exporter both measure against it. The maths is covered by `scripts/check-label.ts`.

Anything that draws a frame around an icon goes through `src/components/IconFrame.tsx`,
which sizes the frame from the icon's own reach — the highlight ring plus the drop shadow —
so a card can never paint over the frame that marks it as selected.

Glyphs come from [Lucide](https://lucide.dev) by name (`src/glyphs.ts`), or from an SVG you
import. An imported file is kept as the drawing it holds: `src/svg.ts` reads its `<svg>` with
the browser's own parser and renders the markup as it is, so shapes, groups, transforms,
stylesheets, gradients, clip paths and colours all arrive as they were drawn. What the import
adds is the box: the drawing is measured through `getBBox()`, fitted to a square box centred
on its own bounds, and scaled so its longest side fills 83% of that box — the same share a
bundled glyph fills, so imported and built-in icons carry the same optical weight. A file with
no `viewBox` is drawn in its own width and height instead.

Importing is also the trust boundary: scripts, embedded documents, event handlers and
references that reach outside the file — a stylesheet's at-rules and any external `url()`
among them — are dropped, ids and stylesheet selectors are scoped to the drawing's own key so
two icons on one page cannot reach into each other, and a stylesheet cannot restyle the app's
page. The drawing then lives in the folder inside a `<g>` that carries the root's own
presentation attributes, which is what keeps a file's inheritance — and a file an older build
wrote is wrapped the same way on its next save. `mergeColours` in `src/svg.ts` is the separate
step that draws every layer in the glyph colour, which is what the inspector's
`Merge to one colour` runs.

A drawing that is nothing but `<path>` elements — its `title`, `desc` and `metadata` aside —
also comes back as paths, and that is what the point editor changes; `parseSvg` reads that flat
subset.

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
