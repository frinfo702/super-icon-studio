import { useRef, useState, type PointerEvent } from 'react'
import { pathPoints } from '../path'
import type { Artwork, Metrics } from '../model'

/**
 * The point handles an imported drawing is edited with, laid over the artwork inside the
 * card: the drawing's own anchors can be dragged, the surface around them moves the artwork
 * and the corner handles size it. Everything it reports is already in the card's units, so
 * the card does not have to know how the drawing is edited.
 */
export function ArtworkPoints({
  artwork,
  box,
  short,
  card,
  metrics,
  onPoint,
  onMetrics,
}: {
  artwork: Artwork
  /** The square the drawing is drawn into, in the card's own units. */
  box: number
  /** The card's short side, which the offsets are measured against. */
  short: number
  /** The card's own box, so a handle never lands in a rounded corner it would be clipped by. */
  card: { width: number; height: number; radius: number }
  metrics: Metrics
  onPoint: (pathIndex: number, pointIndex: number, x: number, y: number) => void
  onMetrics: (patch: Partial<Metrics>) => void
}) {
  const [vbX, vbY, vbWidth, vbHeight] = artwork.viewBox.split(/[\s,]+/).map(Number)
  const scale = Math.min(box / vbWidth, box / vbHeight)
  const insetX = (box - vbWidth * scale) / 2
  const insetY = (box - vbHeight * scale) / 2
  const toScreen = (x: number, y: number) => ({
    x: insetX + (x - vbX) * scale,
    y: insetY + (y - vbY) * scale,
  })
  const toDrawing = (clientX: number, clientY: number, rect: DOMRect) => ({
    x: vbX + (clientX - rect.left - insetX) / scale,
    y: vbY + (clientY - rect.top - insetY) / scale,
  })

  const surface = useRef<HTMLDivElement>(null)
  const drag = useRef<{ kind: string; startX: number; startY: number; base: Metrics; distance: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const unit = Math.max(4, short * 0.022)
  const corner = Math.max(5, short * 0.032)
  const clear = 0.3 * card.radius
  const keep = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high)
  const bounds = {
    x: [(card.width - box) / -2 + clear, (card.width + box) / 2 - clear - corner],
    y: [(card.height - box) / -2 + clear, (card.height + box) / 2 - clear - corner],
  }
  const points = (artwork.paths ?? []).flatMap((path, pathIndex) =>
    pathPoints(path.d).map((point) => ({ pathIndex, ...point })),
  )

  const begin = (event: PointerEvent<HTMLDivElement>, kind: string) => {
    const rect = surface.current?.getBoundingClientRect()
    if (!rect) return
    event.preventDefault()
    event.stopPropagation()
    // Capture keeps the drag alive outside the handle; it can refuse a pointer that is gone.
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // A pointer the browser no longer knows: the events still arrive at this element.
    }
    const centreX = rect.left + rect.width / 2
    const centreY = rect.top + rect.height / 2
    drag.current = {
      kind,
      startX: event.clientX,
      startY: event.clientY,
      base: metrics,
      distance: Math.max(1, Math.hypot(event.clientX - centreX, event.clientY - centreY)),
    }
    setDragging(true)
  }

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const held = drag.current
    const rect = surface.current?.getBoundingClientRect()
    if (!held || !rect) return
    const dx = event.clientX - held.startX
    const dy = event.clientY - held.startY

    if (held.kind === 'move') {
      onMetrics({
        glyphOffset: {
          x: held.base.glyphOffset.x + (dx / short) * 100,
          y: held.base.glyphOffset.y + (dy / short) * 100,
        },
      })
      return
    }
    if (held.kind === 'scale') {
      const centreX = rect.left + rect.width / 2
      const centreY = rect.top + rect.height / 2
      const distance = Math.hypot(event.clientX - centreX, event.clientY - centreY)
      const factor = distance / held.distance
      onMetrics({ glyphScale: Math.min(200, Math.max(50, Math.round(held.base.glyphScale * factor))) })
      return
    }
    const [pathIndex, pointIndex] = held.kind.split(':').map(Number)
    const at = toDrawing(event.clientX, event.clientY, rect)
    onPoint(pathIndex, pointIndex, at.x, at.y)
  }

  const end = () => {
    drag.current = null
    setDragging(false)
  }

  return (
    <div
      ref={surface}
      className="absolute inset-0 touch-none select-none"
      style={{ cursor: dragging ? 'grabbing' : 'grab', pointerEvents: 'auto' }}
      onPointerDown={(event) => begin(event, 'move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute rounded-[6px] border border-dashed"
        style={{
          left: insetX,
          top: insetY,
          width: vbWidth * scale,
          height: vbHeight * scale,
          borderColor: 'var(--accent)',
        }}
      />
      {points.map((point) => {
        const at = toScreen(point.x, point.y)
        return (
          <div
            key={`${point.pathIndex}:${point.index}`}
            className="absolute rounded-full border-2 bg-white"
            style={{
              left: at.x - unit / 2,
              top: at.y - unit / 2,
              width: unit,
              height: unit,
              borderColor: 'var(--accent)',
              cursor: 'move',
            }}
            onPointerDown={(event) => begin(event, `${point.pathIndex}:${point.index}`)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          />
        )
      })}
      {[
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ].map(([across, down]) => (
        <div
          key={`${across}:${down}`}
          className="absolute rounded-[2px] border bg-white"
          style={{
            left: keep(insetX + across * vbWidth * scale - across * corner, bounds.x[0], bounds.x[1]),
            top: keep(insetY + down * vbHeight * scale - down * corner, bounds.y[0], bounds.y[1]),
            width: corner,
            height: corner,
            borderColor: 'var(--accent)',
            cursor: 'nwse-resize',
          }}
          onPointerDown={(event) => begin(event, 'scale')}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      ))}
    </div>
  )
}
