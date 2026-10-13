/** What back and forward walk: the states behind the one on screen, that state, and the states
 *  a forward step would bring back. States are shared, not copied, so a step is a few pointers. */
export type Timeline<T> = { past: T[]; present: T; future: T[] }

export function start<T>(present: T): Timeline<T> {
  return { past: [], present, future: [] }
}

/** A settled edit becomes the present; the state it replaced joins the past, and the edit
 *  replaces whatever a forward step was holding. */
export function commit<T>(timeline: Timeline<T>, present: T): Timeline<T> {
  if (present === timeline.present) return timeline
  return { past: [...timeline.past, timeline.present], present, future: [] }
}

export function undo<T>(timeline: Timeline<T>): Timeline<T> | null {
  const last = timeline.past.length - 1
  if (last < 0) return null
  return {
    past: timeline.past.slice(0, last),
    present: timeline.past[last],
    future: [timeline.present, ...timeline.future],
  }
}

export function redo<T>(timeline: Timeline<T>): Timeline<T> | null {
  if (!timeline.future.length) return null
  const [present, ...future] = timeline.future
  return { past: [...timeline.past, timeline.present], present, future }
}
