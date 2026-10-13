import { ChevronDown, ChevronUp, GripVertical, Plus, RotateCcw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { IconCard } from '../components/IconCard'
import { Footer } from '../components/Footer'
import { Group, Section, Segmented, SelectRow, SliderRow, ToggleRow } from '../components/rows'
import {
  ANIMATION_STYLES,
  EASINGS,
  GROUP_LAYOUTS,
  layoutGroup,
  type IconGroup,
} from '../group'
import type { IconDef, Mode } from '../model'

type Patch = (patch: Partial<IconGroup>) => void

/* -------------------------------------------------------------------------- artwork */

export function GroupArtwork({
  group,
  icons,
  mode,
  unit,
  animate = false,
  playKey = 0,
}: {
  group: IconGroup
  icons: IconDef[]
  mode: Mode
  unit: number
  animate?: boolean
  playKey?: number
}) {
  const [settled, setSettled] = useState(!animate)
  const { slots, width, height } = layoutGroup(group, icons, unit)
  const easing = EASINGS[group.animation.style]

  useEffect(() => {
    if (!animate) return
    setSettled(false)
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setSettled(true))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [animate, playKey, group.depth, group.layout, unit])

  return (
    <div className="relative" style={{ width, height }}>
      {slots.map((slot, index) => {
        const delay = index * group.animation.stagger
        const collapse = slot.size * 0.25
        const from =
          group.layout === 'Horizontal'
            ? `translateX(${-collapse}px) scale(0.6)`
            : `translateY(${-collapse}px) scale(0.6)`

        return (
          <div
            key={slot.icon.id}
            data-icon={slot.icon.id}
            className="absolute left-0 top-0"
            style={{
              transform: settled ? `translate(${slot.x}px, ${slot.y}px) rotate(${slot.rotation}deg)` : from,
              opacity: settled ? 1 : 0,
              transition: animate
                ? `transform ${group.animation.duration}s ${easing} ${delay}s, opacity ${group.animation.duration * 0.7}s ease ${delay}s`
                : undefined,
            }}
          >
            <IconCard
              icon={slot.icon}
              mode={mode}
              size={slot.size}
              glyphShift={{ x: slot.glyphDx, y: slot.glyphDy }}
            />
          </div>
        )
      })}
    </div>
  )
}

/* --------------------------------------------------------------------------- sidebar */

export function ComposerSidebar({ group, icons, onPatch }: { group: IconGroup; icons: IconDef[]; onPatch: Patch }) {
  const [dragging, setDragging] = useState<number | null>(null)
  const layers = group.layers
    .map((id) => icons.find((icon) => icon.id === id))
    .filter((icon): icon is IconDef => Boolean(icon))
  const depth = Math.min(group.depth, layers.length)

  const move = (from: number, to: number) => {
    if (to < 0 || to >= layers.length || from === to) return
    const next = [...group.layers]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onPatch({ layers: next })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pb-1 pt-3">
        <div className="flex items-baseline justify-between pb-1.5">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Depth</span>
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
            {depth} of {layers.length}
          </span>
        </div>
        <input
          type="range"
          className="slider w-full"
          min={1}
          max={Math.max(1, layers.length)}
          step={1}
          value={depth}
          style={{ '--fill': `${layers.length > 1 ? ((depth - 1) / (layers.length - 1)) * 100 : 100}%` } as React.CSSProperties}
          onChange={(event) => onPatch({ depth: Number(event.target.value) })}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pt-3">
        {layers.map((icon, index) => (
          <div
            key={icon.id}
            draggable
            onDragStart={() => setDragging(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              if (dragging !== null) move(dragging, index)
              setDragging(null)
            }}
            onDragEnd={() => setDragging(null)}
            className={`flex h-[32px] items-center gap-2 rounded-lg px-2 ${
              index < depth ? 'bg-black/[0.05] dark:bg-white/[0.08]' : 'opacity-45'
            } ${dragging === index ? 'ring-1 ring-[var(--accent)]' : ''}`}
          >
            <GripVertical size={12} className="shrink-0 cursor-grab text-neutral-400" />
            <IconCard icon={icon} mode="light" size={18} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate text-[12px]">{icon.name}</span>
            <div className="flex shrink-0 items-center gap-0.5 text-neutral-500 dark:text-neutral-400">
              <button
                type="button"
                title="Move forward"
                className="grid size-5 place-items-center rounded hover:bg-black/[0.08] dark:hover:bg-white/[0.12]"
                onClick={() => move(index, index - 1)}
              >
                <ChevronUp size={11} />
              </button>
              <button
                type="button"
                title="Move back"
                className="grid size-5 place-items-center rounded hover:bg-black/[0.08] dark:hover:bg-white/[0.12]"
                onClick={() => move(index, index + 1)}
              >
                <ChevronDown size={11} />
              </button>
              <button
                type="button"
                title="Remove layer"
                className="grid size-5 place-items-center rounded hover:bg-black/[0.08] dark:hover:bg-white/[0.12]"
                onClick={() =>
                  onPatch({ layers: group.layers.filter((id) => id !== icon.id), depth: Math.max(1, depth - 1) })
                }
              >
                <X size={11} />
              </button>
            </div>
          </div>
        ))}

        <div className="px-1 pt-2">
          <AddLayer layers={group.layers} icons={icons} onAdd={(id) => onPatch({ layers: [...group.layers, id], depth: depth + 1 })} />
        </div>
      </div>
    </div>
  )
}

function AddLayer({
  layers,
  icons,
  onAdd,
}: {
  layers: string[]
  icons: IconDef[]
  onAdd: (id: string) => void
}) {
  const available = icons.filter((icon) => !layers.includes(icon.id))
  return (
    <div className="flex h-7 items-center gap-1.5 rounded-md bg-black/[0.05] px-2 dark:bg-white/[0.08]">
      <Plus size={11} className="shrink-0 text-neutral-500" />
      <select
        value=""
        disabled={available.length === 0}
        onChange={(event) => event.target.value && onAdd(event.target.value)}
        className="min-w-0 flex-1 appearance-none bg-transparent text-[12px] text-neutral-700 dark:text-neutral-300"
      >
        <option value="">{available.length === 0 ? 'Every icon is in the deck' : 'Add layer…'}</option>
        {available.map((icon) => (
          <option key={icon.id} value={icon.id}>
            {icon.name}
          </option>
        ))}
      </select>
    </div>
  )
}

/* ---------------------------------------------------------------------------- canvas */

export function ComposerCanvas({
  group,
  icons,
  mode,
  zoom,
  onZoom,
}: {
  group: IconGroup
  icons: IconDef[]
  mode: Mode
  zoom: number
  onZoom: (zoom: number) => void
}) {
  const [play, setPlay] = useState(0)
  const unit = 72 * zoom

  return (
    <div className="flex h-full flex-col items-center pt-14">
      <div className="grid flex-1 place-items-center">
        <GroupArtwork group={group} icons={icons} mode={mode} unit={unit} animate playKey={play} />
      </div>

      <div className="flex flex-col items-center gap-3 pb-20">
        <PreviewTab group={group} icons={icons} mode={mode} unit={13} zoom={zoom} />
        <PreviewTab group={group} icons={icons} mode={mode} unit={9} zoom={zoom} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        <div className="pointer-events-auto flex w-[240px] items-center gap-2 rounded-full bg-white/70 px-3 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.12] dark:ring-white/10">
          <input
            type="range"
            className="slider w-full"
            min={0.6}
            max={2.4}
            step={0.1}
            value={zoom}
            style={{ '--fill': `${((zoom - 0.6) / 1.8) * 100}%` } as React.CSSProperties}
            onChange={(event) => onZoom(Number(event.target.value))}
          />
        </div>
        <button
          type="button"
          title="Replay the animation"
          aria-label="Replay the animation"
          onClick={() => setPlay((value) => value + 1)}
          className="pointer-events-auto grid size-[32px] place-items-center rounded-full bg-white/70 text-neutral-600 shadow-[0_2px_10px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.12] dark:text-neutral-200 dark:ring-white/10"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  )
}

/** How the deck reads where the app actually uses it: a tab with a label and a close box. */
function PreviewTab({
  group,
  icons,
  mode,
  unit,
  zoom,
}: {
  group: IconGroup
  icons: IconDef[]
  mode: Mode
  unit: number
  zoom: number
}) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] bg-black/[0.04] py-1.5 pl-2.5 pr-3.5 shadow-sm dark:bg-white/[0.07]">
      <GroupArtwork group={group} icons={icons} mode={mode} unit={unit} />
      <span className="text-[13px]" style={{ fontSize: 12 + zoom * 1.5 }}>
        {group.name}
      </span>
      <X size={11} className="text-neutral-400 dark:text-neutral-500" />
    </div>
  )
}

/* ------------------------------------------------------------------------- inspector */

export function ComposerInspector({
  group,
  dirty,
  tab,
  onTab,
  onPatch,
  onRevert,
  onSave,
}: {
  group: IconGroup
  dirty: boolean
  tab: 'layout' | 'animation'
  onTab: (tab: 'layout' | 'animation') => void
  onPatch: Patch
  onRevert: () => void
  onSave: () => void
}) {
  const vertical = group.layout === 'Vertical'

  return (
    <>
      <div className="flex-1 overflow-y-auto pb-2">
        <div className="px-3 pb-2 pt-3">
          <Segmented
            value={tab}
            onChange={onTab}
            options={[
              { value: 'layout', label: 'Layout' },
              { value: 'animation', label: 'Animation' },
            ]}
          />
        </div>

        {tab === 'layout' ? (
          <>
            <Section title="Layout" hint={group.layout} />
            <Group>
              <SelectRow
                label="Direction"
                value={group.layout}
                options={GROUP_LAYOUTS}
                onChange={(layout) => onPatch({ layout })}
              />
              <ToggleRow
                label="Automatic gap"
                checked={group.autoGap}
                onChange={(autoGap) => onPatch({ autoGap })}
              />
              {group.autoGap ? null : (
                <>
                  <SliderRow label="Amount" value={group.gap} min={0} max={100} onChange={(gap) => onPatch({ gap })} />
                </>
              )}
              <ToggleRow label="Scale" checked={group.scale} onChange={(scale) => onPatch({ scale })} />
              <SliderRow
                label="Amount"
                value={group.scaleAmount}
                min={0}
                max={40}
                decimals={0}
                onChange={(scaleAmount) => onPatch({ scaleAmount })}
              />
              <ToggleRow label="Rotate" checked={group.rotate} onChange={(rotate) => onPatch({ rotate })} />
              <SliderRow
                label="Amount"
                value={group.rotateAmount}
                min={0}
                max={30}
                decimals={0}
                suffix="°"
                onChange={(rotateAmount) => onPatch({ rotateAmount })}
              />
              <ToggleRow label={vertical ? 'X offset' : 'Y offset'} checked={group.offset} onChange={(offset) => onPatch({ offset })} />
              <SliderRow
                label="Amount"
                value={group.offsetAmount}
                min={-50}
                max={50}
                onChange={(offsetAmount) => onPatch({ offsetAmount })}
              />
            </Group>

            <Section title="Options" hint={group.layout} />
            <Group>
              <ToggleRow
                label="Reserve empty slots"
                checked={group.reserveSlots}
                onChange={(reserveSlots) => onPatch({ reserveSlots })}
              />
              <ToggleRow
                label="Glyph offset"
                checked={group.glyphOffset}
                onChange={(glyphOffset) => onPatch({ glyphOffset })}
              />
              <SliderRow
                label="Amount"
                value={group.glyphOffsetAmount}
                min={0}
                max={60}
                onChange={(glyphOffsetAmount) => onPatch({ glyphOffsetAmount })}
              />
            </Group>
          </>
        ) : (
          <>
            <Section title="Entrance" hint={group.animation.style} />
            <Group>
              <SliderRow
                label="Duration"
                value={group.animation.duration}
                min={0.1}
                max={1.2}
                step={0.05}
                decimals={2}
                suffix="s"
                onChange={(duration) => onPatch({ animation: { ...group.animation, duration } })}
              />
              <SliderRow
                label="Stagger"
                value={group.animation.stagger}
                min={0}
                max={0.3}
                step={0.01}
                decimals={2}
                suffix="s"
                onChange={(stagger) => onPatch({ animation: { ...group.animation, stagger } })}
              />
              <SelectRow
                label="Easing"
                value={group.animation.style}
                options={ANIMATION_STYLES}
                onChange={(style) => onPatch({ animation: { ...group.animation, style } })}
              />
            </Group>
          </>
        )}
      </div>

      <Footer dirty={dirty} onRevert={onRevert} onSave={onSave} />
    </>
  )
}
