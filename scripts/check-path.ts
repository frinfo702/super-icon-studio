import assert from 'node:assert'
import { movePathPoint, pathPoints } from '../src/path.ts'

const at = (d: string) => pathPoints(d).map((p) => `${p.x} ${p.y}`)

// Anchors come back in the path's own coordinates, whatever case they were written in.
assert.deepEqual(at('M0 0 L10 0 L10 10 Z'), ['0 0', '10 0', '10 10'])
assert.deepEqual(at('m1 2 l3 4'), ['1 2', '4 6'])
assert.deepEqual(at('M0 0 H10 V10'), ['0 0', '10 0', '10 10'])
assert.deepEqual(at('M0 0 C1 1 2 2 3 3'), ['0 0', '3 3'])
assert.deepEqual(at('M0 0 Q1 1 2 2 S3 3 4 4'), ['0 0', '2 2', '4 4'])
assert.deepEqual(at('M0 0 A1 1 0 0 0 2 2'), ['0 0', '2 2'])
assert.deepEqual(at('M0 0 L1 0 M5 5 L6 5'), ['0 0', '1 0', '5 5', '6 5'])

// A drag rewrites the numbers it owns and nothing else.
const moved = movePathPoint('M0 0 L10 0 L10 10', 1, 12, 3)
assert.equal(moved, 'M0 0 L12 3 L10 10')

// The set after it measures itself from the anchor, so it is shifted to stay put.
const relative = movePathPoint('M0 0 l10 0 l0 10', 1, 12, 3)
assert.deepEqual(at(relative), ['0 0', '12 3', '10 10']) // the third anchor keeps its place
assert.equal(relative, 'M0 0 l12 3 l-2 7')

// A handle that belongs to the anchor follows it, keeping the curve's shape.
const curve = movePathPoint('M0 0 C2 2 4 4 6 6', 1, 7, 8)
assert.equal(curve, 'M0 0 C2 2 5 6 7 8') // the handle before the anchor stays put

// A following curve keeps its place by shifting every coordinate it measures from the anchor.
const after = movePathPoint('M0 0 L4 0 c1 1 2 2 3 3', 1, 5, 2)
assert.deepEqual(at(after), ['0 0', '5 2', '7 3'])
assert.equal(after, 'M0 0 L5 2 c0 -1 1 0 2 1')

// Arcs only move their end point: radii, rotation and flags are never offsets.
const arc = movePathPoint('M0 0 A5 5 45 1 0 10 0', 1, 10, 5)
assert.equal(arc, 'M0 0 A5 5 45 1 0 10 5')

// Moving a point is reversible, and a Z is not draggable.
const back = movePathPoint(moved, 1, 10, 0)
assert.equal(back, 'M0 0 L10 0 L10 10')
assert.equal(movePathPoint('M0 0 L10 0 Z', 2, 4, 4), 'M0 0 L10 0 Z')

// The whole drawing survives a drag: every other command is left as it was written.
const drawing = 'M52.4285 162.873L98.7844 136.879C99 135 100 134 101 133.334H96.4921V120.5Z'
const dragged = movePathPoint(drawing, 1, 100, 140)
assert.equal(dragged, 'M52.4285 162.873L100 140C99 135 100 134 101 133.334H96.4921V120.5Z')

console.log('path editing: all checks passed')
