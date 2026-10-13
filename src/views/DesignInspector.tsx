import { ChevronsUpDown, Plus } from 'lucide-react'
import { useState } from 'react'
import { Footer } from '../components/Footer'
import { IconCard } from '../components/IconCard'
import {
  BACKGROUNDS,
  BLEND_MODES,
  DEFAULT_LABEL,
  DEFAULT_METRICS,
  GRADIENT_STYLES,
  LABEL_BACKGROUNDS,
  LABEL_HIGHLIGHTS,
  LABEL_PLACEHOLDER,
  LABEL_RANGE,
  LABEL_SHAPES,
  SHAPES,
  SIZE_PRESETS,
  TEXTURES,
  defaultFinish,
  type Appearance,
  type BlendMode,
  type GradientStyle,
  type IconDef,
  type Label,
  type Mode,
} from '../model'
import {
  ColorRow,
  Group,
  Section,
  Segmented,
  SelectRow,
  SliderRow,
  TextRow,
  ToggleRow,
} from '../components/rows'

/** The panels the card itself carries, plus one per component the icon has been given. */
export type DesignTab = DesignSection | `label:${string}`
type DesignSection = 'size' | 'gradient' | 'highlight' | 'card'

const TAB_TITLES: Record<DesignSection, string> = {
  size: 'Size',
  gradient: 'Gradient',
  highlight: 'Highlight',
  card: 'Card',
}

const tabIcon = (children: React.ReactNode) => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    {children}
  </svg>
)

const TAB_ICONS: Record<DesignSection, React.ReactNode> = {
  size: tabIcon(
    <rect x="1.5" y="5" width="12" height="5" rx="2.5" stroke="currentColor" strokeWidth="1.4" />,
  ),
  gradient: tabIcon(
    <>
      <rect x="3" y="3.5" width="9" height="2.2" rx="1.1" fill="currentColor" />
      <rect x="3" y="6.6" width="9" height="2.2" rx="1.1" fill="currentColor" opacity="0.6" />
      <rect x="3" y="9.7" width="9" height="2.2" rx="1.1" fill="currentColor" opacity="0.3" />
    </>,
  ),
  highlight: tabIcon(
    <rect x="2.5" y="2.5" width="10" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.4" />,
  ),
  card: tabIcon(<rect x="1.5" y="1.5" width="12" height="12" rx="3.2" fill="currentColor" />),
}

type Props = {
  icon: IconDef | undefined
  mode: Mode
  tab: DesignTab
  dirty: boolean
  presetId: string
  onTabChange: (tab: DesignTab) => void
  onPresetChange: (id: string) => void
  onPatch: (patch: Partial<IconDef>) => void
  onPatchAppearance: (patch: Partial<Appearance>) => void
  onAddLabel: () => void
  onPatchLabel: (id: string, patch: Partial<Label>) => void
  onRemoveLabel: (id: string) => void
  onReset: () => void
  onRevert: () => void
  onSave: () => void
}

export function DesignInspector({
  icon,
  mode,
  tab,
  dirty,
  presetId,
  onTabChange,
  onPresetChange,
  onPatch,
  onPatchAppearance,
  onAddLabel,
  onPatchLabel,
  onRemoveLabel,
  onReset,
  onRevert,
  onSave,
}: Props) {
  if (!icon) return null

  const a = icon[mode]
  const gradient = a.gradient
  const highlight = a.highlight
  const defaults = defaultFinish(mode)
  const [confirmingReset, setConfirmingReset] = useState(false)
  // A component tab names its component; a card panel is what is left when there is no such one.
  const label = tab.startsWith('label:') ? a.labels.find((entry) => `label:${entry.id}` === tab) : undefined
  const showCard = tab === 'card' || (tab.startsWith('label:') && !label)
  const modeName = `${mode === 'light' ? 'Light' : 'Dark'} Mode`

  return (
    <>
      <div className="flex-1 overflow-y-auto pb-2">
        <div className="p-3">
          <div className="grid h-[104px] place-items-center rounded-[10px] bg-black/[0.04] dark:bg-white/[0.06]">
            <IconCard icon={icon} mode={mode} size={72} />
          </div>
        </div>

        <div className="flex h-9 items-center gap-3 px-3">
          <span className="flex-1 text-[13px]">Source</span>
          <div className="flex items-center gap-1 rounded-md bg-black/[0.05] px-2 py-[3px] text-[12px] dark:bg-white/[0.1]">
            {icon.name}
            <ChevronsUpDown size={12} className="text-neutral-500 dark:text-neutral-400" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 pb-3 pt-1">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <Segmented
              value={tab}
              onChange={onTabChange}
              options={[
                ...(Object.keys(TAB_TITLES) as DesignSection[]).map((value) => ({
                  value: value as DesignTab,
                  icon: TAB_ICONS[value],
                })),
                ...a.labels.map((component) => ({
                  value: `label:${component.id}` as DesignTab,
                  icon: (
                    <span className="inline-block max-w-[26px] truncate text-[10px] font-medium">
                      {component.text.trim() || 'Text'}
                    </span>
                  ),
                  title: component.text.trim() || 'Text component',
                })),
              ]}
            />
          </div>
          <button
            type="button"
            title="Add a component"
            aria-label="Add a component"
            onClick={onAddLabel}
            className="grid size-[28px] shrink-0 place-items-center rounded-[9px] bg-black/[0.06] text-neutral-600 hover:bg-black/[0.1] dark:bg-white/[0.1] dark:text-neutral-300 dark:hover:bg-white/[0.16]"
          >
            <Plus size={13} />
          </button>
        </div>

        <Section
          title={label ? 'Text' : showCard ? TAB_TITLES.card : TAB_TITLES[tab as DesignSection]}
          hint={tab === 'size' ? undefined : modeName}
        />

        <Group>
          {tab === 'size' ? (
            <>
              <SelectRow
                label="Preset"
                value={presetId}
                options={SIZE_PRESETS.map((preset) => preset.id)}
                format={(id) => SIZE_PRESETS.find((preset) => preset.id === id)?.name ?? id}
                onChange={onPresetChange}
              />
              <SelectRow
                label="Shape"
                value={icon.metrics.shape}
                options={SHAPES}
                def={DEFAULT_METRICS.shape}
                onChange={(shape) => onPatch({ metrics: { ...icon.metrics, shape } })}
              />
              <SliderRow
                label="Glyph scale"
                value={icon.metrics.glyphScale}
                min={50}
                max={200}
                def={DEFAULT_METRICS.glyphScale}
                onChange={(glyphScale) => onPatch({ metrics: { ...icon.metrics, glyphScale } })}
              />
              {icon.metrics.shape === 'Circle' ? null : (
                <SliderRow
                  label="Corner radius"
                  value={icon.metrics.cornerRadius}
                  min={0}
                  max={50}
                  def={DEFAULT_METRICS.cornerRadius}
                  onChange={(cornerRadius) => onPatch({ metrics: { ...icon.metrics, cornerRadius } })}
                />
              )}
              <ToggleRow
                label="Peeled corner"
                checked={icon.metrics.peel}
                def={false}
                onChange={(peel) => onPatch({ metrics: { ...icon.metrics, peel } })}
              />
            </>
          ) : null}

          {tab === 'gradient' ? (
            <>
              <SliderRow
                label="Strength"
                value={gradient.strength}
                def={defaults.gradient.strength}
                min={0}
                max={300}
                onChange={(strength) =>
                  onPatchAppearance({ gradient: { ...gradient, strength } })
                }
              />
              <SelectRow
                label="Style"
                value={gradient.style}
                def={defaults.gradient.style}
                options={GRADIENT_STYLES}
                onChange={(style: GradientStyle) => onPatchAppearance({ gradient: { ...gradient, style } })}
              />
              <SelectRow
                label="Blend mode"
                value={gradient.blend}
                def={defaults.gradient.blend}
                options={BLEND_MODES}
                onChange={(blend: BlendMode) => onPatchAppearance({ gradient: { ...gradient, blend } })}
              />
              <SliderRow
                label="Offset X"
                value={gradient.offsetX}
                def={defaults.gradient.offsetX}
                min={-100}
                max={100}
                onChange={(offsetX) => onPatchAppearance({ gradient: { ...gradient, offsetX } })}
              />
              <SliderRow
                label="Offset Y"
                value={gradient.offsetY}
                def={defaults.gradient.offsetY}
                min={-100}
                max={100}
                onChange={(offsetY) => onPatchAppearance({ gradient: { ...gradient, offsetY } })}
              />
              <SliderRow
                label="Size X"
                value={gradient.sizeX}
                def={defaults.gradient.sizeX}
                min={0}
                max={400}
                onChange={(sizeX) => onPatchAppearance({ gradient: { ...gradient, sizeX } })}
              />
              <SliderRow
                label="Size Y"
                value={gradient.sizeY}
                def={defaults.gradient.sizeY}
                min={0}
                max={400}
                onChange={(sizeY) => onPatchAppearance({ gradient: { ...gradient, sizeY } })}
              />
            </>
          ) : null}

          {tab === 'highlight' ? (
            <>
              <ColorRow
                label="Color"
                value={highlight.color}
                def={defaults.highlight.color}
                onChange={(color) => onPatchAppearance({ highlight: { ...highlight, color } })}
              />
              <SliderRow
                label="Opacity"
                value={highlight.opacity}
                min={0}
                max={100}
                def={defaults.highlight.opacity}
                onChange={(opacity) => onPatchAppearance({ highlight: { ...highlight, opacity } })}
              />
              <SelectRow
                label="Blend mode"
                value={highlight.blend}
                def={defaults.highlight.blend}
                options={BLEND_MODES}
                onChange={(blend: BlendMode) => onPatchAppearance({ highlight: { ...highlight, blend } })}
              />
              <SliderRow
                label="Blur"
                value={highlight.blur}
                min={0}
                max={20}
                def={defaults.highlight.blur}
                onChange={(blur) => onPatchAppearance({ highlight: { ...highlight, blur } })}
              />
            </>
          ) : null}

          {showCard ? (
            <>
              <ColorRow label="Card" value={a.card} onChange={(card) => onPatchAppearance({ card })} />
              <ColorRow label="Glyph" value={a.glyph} onChange={(glyph) => onPatchAppearance({ glyph })} />
              <SelectRow
                label="Background"
                value={a.background}
                options={BACKGROUNDS}
                def="Plain"
                onChange={(background) => onPatchAppearance({ background })}
              />
              <SelectRow
                label="Texture"
                value={a.texture}
                def="None"
                options={TEXTURES}
                onChange={(texture) => onPatchAppearance({ texture })}
              />
              <ToggleRow
                label="Glass glyph"
                checked={a.glyphGlass}
                def={false}
                onChange={(glyphGlass) => onPatchAppearance({ glyphGlass })}
              />
            </>
          ) : null}
        </Group>

        {label ? (
          <>
            <Group>
              <TextRow
                label="Text"
                value={label.text}
                placeholder={LABEL_PLACEHOLDER}
                onChange={(text) => onPatchLabel(label.id, { text })}
              />
              <SliderRow
                label="Font size"
                value={label.size}
                min={5}
                max={40}
                def={DEFAULT_LABEL.size}
                onChange={(size) => onPatchLabel(label.id, { size })}
              />
              <ColorRow
                label="Color"
                value={label.color}
                def={DEFAULT_LABEL.color}
                onChange={(color) => onPatchLabel(label.id, { color })}
              />
            </Group>

            <Section title="Background" />
            <Group>
              <SelectRow
                label="Background"
                value={label.background}
                options={LABEL_BACKGROUNDS}
                def={DEFAULT_LABEL.background}
                onChange={(background) => onPatchLabel(label.id, { background })}
              />
              {label.background === 'Solid' ? (
                <ColorRow
                  label="Fill"
                  value={label.fill}
                  def={DEFAULT_LABEL.fill}
                  onChange={(fill) => onPatchLabel(label.id, { fill })}
                />
              ) : null}
              {label.background === 'Gradient' ? (
                <>
                  <ColorRow
                    label="Start"
                    value={label.fill}
                    def={DEFAULT_LABEL.fill}
                    onChange={(fill) => onPatchLabel(label.id, { fill })}
                  />
                  <ColorRow
                    label="End"
                    value={label.fillEnd}
                    def={DEFAULT_LABEL.fillEnd}
                    onChange={(fillEnd) => onPatchLabel(label.id, { fillEnd })}
                  />
                  <SliderRow
                    label="Angle"
                    value={label.angle}
                    min={0}
                    max={360}
                    suffix="°"
                    def={DEFAULT_LABEL.angle}
                    onChange={(angle) => onPatchLabel(label.id, { angle })}
                  />
                </>
              ) : null}
              {label.background === 'None' ? null : (
                <SliderRow
                  label="Opacity"
                  value={label.opacity}
                  min={0}
                  max={100}
                  def={DEFAULT_LABEL.opacity}
                  onChange={(opacity) => onPatchLabel(label.id, { opacity })}
                />
              )}
            </Group>

            <Section title="Highlight" />
            <Group>
              <SelectRow
                label="Highlight"
                value={label.highlight}
                options={LABEL_HIGHLIGHTS}
                def={DEFAULT_LABEL.highlight}
                onChange={(highlight) => onPatchLabel(label.id, { highlight })}
              />
              {label.highlight === 'Custom' ? (
                <>
                  <ColorRow
                    label="Color"
                    value={label.highlightColor}
                    def={DEFAULT_LABEL.highlightColor}
                    onChange={(highlightColor) => onPatchLabel(label.id, { highlightColor })}
                  />
                  <SliderRow
                    label="Opacity"
                    value={label.highlightOpacity}
                    min={0}
                    max={100}
                    def={DEFAULT_LABEL.highlightOpacity}
                    onChange={(highlightOpacity) => onPatchLabel(label.id, { highlightOpacity })}
                  />
                </>
              ) : null}
            </Group>

            <Section title="Shape" />
            <Group>
              <SelectRow
                label="Shape"
                value={label.shape}
                options={LABEL_SHAPES}
                def={DEFAULT_LABEL.shape}
                onChange={(shape) => onPatchLabel(label.id, { shape })}
              />
              {label.shape === 'Rounded' ? (
                <SliderRow
                  label="Corner radius"
                  value={label.radius}
                  min={0}
                  max={50}
                  def={DEFAULT_LABEL.radius}
                  onChange={(radius) => onPatchLabel(label.id, { radius })}
                />
              ) : null}
            </Group>

            <Section title="Placement" hint="Drag it on the card too" />
            <Group>
              <SliderRow
                label="X"
                value={label.x}
                min={-LABEL_RANGE}
                max={LABEL_RANGE}
                def={DEFAULT_LABEL.x}
                onChange={(x) => onPatchLabel(label.id, { x })}
              />
              <SliderRow
                label="Y"
                value={label.y}
                min={-LABEL_RANGE}
                max={LABEL_RANGE}
                def={DEFAULT_LABEL.y}
                onChange={(y) => onPatchLabel(label.id, { y })}
              />
            </Group>
          </>
        ) : null}

        <div className="px-3 pt-2">
          {label ? (
            <button
              type="button"
              title="Take this component off the icon"
              onClick={() => onRemoveLabel(label.id)}
              className="h-7 w-full rounded-md bg-black/[0.05] text-[12px] text-neutral-700 hover:bg-black/[0.09] dark:bg-white/[0.1] dark:text-neutral-200"
            >
              Remove component
            </button>
          ) : confirmingReset ? (
            <div className="flex flex-col gap-1.5">
              <p className="px-0.5 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
                Size, gradient and highlight go back to their defaults.
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingReset(false)
                    onReset()
                  }}
                  className="h-7 flex-1 rounded-md bg-[var(--accent)] text-[12px] font-medium text-white hover:brightness-105"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className="h-7 flex-1 rounded-md bg-black/[0.05] text-[12px] text-neutral-700 hover:bg-black/[0.09] dark:bg-white/[0.1] dark:text-neutral-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="h-7 w-full rounded-md bg-black/[0.05] text-[12px] text-neutral-700 hover:bg-black/[0.09] dark:bg-white/[0.1] dark:text-neutral-200"
            >
              Reset to Defaults
            </button>
          )}
        </div>
      </div>

      <Footer dirty={dirty} onRevert={onRevert} onSave={onSave} />
    </>
  )
}
