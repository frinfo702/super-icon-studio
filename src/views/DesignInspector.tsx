import { ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { Footer } from '../components/Footer'
import { IconCard } from '../components/IconCard'
import {
  BACKGROUNDS,
  BLEND_MODES,
  DEFAULT_LABEL,
  DEFAULT_METRICS,
  GRADIENT_STYLES,
  SHAPES,
  SIZE_PRESETS,
  TEXTURES,
  defaultFinish,
  type Appearance,
  type BlendMode,
  type GradientStyle,
  type IconDef,
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

export type DesignTab = 'size' | 'gradient' | 'highlight' | 'card'

const TAB_TITLES: Record<DesignTab, string> = {
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

const TAB_ICONS: Record<DesignTab, React.ReactNode> = {
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

        <div className="px-3 pb-3 pt-1">
          <Segmented
            value={tab}
            onChange={onTabChange}
            options={(Object.keys(TAB_TITLES) as DesignTab[]).map((value) => ({
              value,
              icon: TAB_ICONS[value],
            }))}
          />
        </div>

        <Section title={TAB_TITLES[tab]} hint={tab === 'size' ? undefined : `${mode === 'light' ? 'Light' : 'Dark'} Mode`} />

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

          {tab === 'card' ? (
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

              <Section title="Label" />
              <TextRow
                label="Text"
                value={a.label.text}
                placeholder="BETA"
                onChange={(text) => onPatchAppearance({ label: { ...a.label, text } })}
              />
              <ColorRow
                label="Text color"
                value={a.label.color}
                def={DEFAULT_LABEL.color}
                onChange={(color) => onPatchAppearance({ label: { ...a.label, color } })}
              />
              <ColorRow
                label="Pill"
                value={a.label.fill}
                def={DEFAULT_LABEL.fill}
                onChange={(fill) => onPatchAppearance({ label: { ...a.label, fill } })}
              />
            </>
          ) : null}
        </Group>

        <div className="px-3 pt-2">
          {confirmingReset ? (
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
