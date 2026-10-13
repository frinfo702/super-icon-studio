import assert from 'node:assert'
import { commit, redo, start, undo, type Timeline } from '../src/history.ts'

// Only the name matters here, so a step is a stub.
type Step = { name: string }
const step = (name: string): Step => ({ name })
const names = (steps: Step[]) => steps.map((entry) => entry.name).join(',')

let walk: Timeline<Step> = start(step('a'))
assert.equal(undo(walk), null, 'there is nothing to step back to at the start')
assert.equal(redo(walk), null, 'there is nothing to step forward to at the start')

// A settled edit becomes the present and pushes the one it replaced onto the past.
walk = commit(walk, step('b'))
walk = commit(walk, step('c'))
assert.equal(walk.present.name, 'c', 'the last settled edit is the present')
assert.equal(names(walk.past), 'a,b', 'the states behind the present are in order')

// Committing what is already the present changes nothing, and keeps the same timeline.
assert.equal(commit(walk, walk.present), walk, 'an unchanged commit is left alone')

// Back hands the present to forward, and forward hands it back.
walk = undo(walk)!
assert.equal(walk.present.name, 'b', 'a step back lands on the state before the present')
assert.equal(names(walk.future), 'c', 'the state left behind waits for a step forward')
walk = redo(walk)!
assert.equal(walk.present.name, 'c', 'a step forward lands back on it')
assert.equal(names(walk.future), '', 'nothing waits in front of the last state')

// An edit made after a step back replaces what a step forward was holding.
walk = undo(walk)!
walk = commit(walk, step('d'))
assert.equal(walk.present.name, 'd', 'the new edit becomes the present')
assert.equal(redo(walk), null, 'the forward states the edit replaced are gone')
assert.equal(names(walk.past), 'a,b', 'the states behind it stay')

// Walking all the way back empties the past and fills the future, and the other way round.
walk = undo(walk)!
walk = undo(walk)!
assert.equal(walk.present.name, 'a', 'the oldest state is reachable')
assert.equal(names(walk.past), '', 'nothing is behind the oldest state')
assert.equal(names(walk.future), 'b,d', 'every state it walked past waits in front')
walk = redo(walk)!
walk = redo(walk)!
assert.equal(walk.present.name, 'd', 'walking forward returns to the newest state')
assert.equal(names(walk.future), '', 'and nothing waits in front of it again')

console.log('undo history: all checks passed')
