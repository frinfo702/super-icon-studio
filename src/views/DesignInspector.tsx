import { ChevronsUpDown } from 'lucide-react'
import { Footer } from '../components/Footer'
import { IconCard } from '../components/IconCard'
import {
  BACKGROUNDS,
  BLEND_MODES,
  GRADIENT_STYLES,
  SHAPES,
  SIZE_PRESETS,
  TEXTURES,
  type Appearance,
  type BlendMode,
  type GradientStyle,
  type IconDef,
  type Mode,
} from '../model'
import { ColorRow, Group, Section, Segmented, SelectRow, SliderRow } from '../components/rows'

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
                onChange={(shape) => onPatch({ metrics: { ...icon.metrics, shape } })}
              />
              <SliderRow
                label="Glyph scale"
                value={icon.metrics.glyphScale}
                min={50}
                max={200}
                onChange={(glyphScale) => onPatch({ metrics: { ...icon.metrics, glyphScale } })}
              />
              {icon.metrics.shape === 'Circle' ? null : (
                <SliderRow
                  label="Corner radius"
                  value={icon.metrics.cornerRadius}
                  min={0}
                  max={50}
                  onChange={(cornerRadius) => onPatch({ metrics: { ...icon.metrics, cornerRadius } })}
                />
              )}
            </>
          ) : null}

          {tab === 'gradient' ? (
            <>
              <SliderRow
                label="Strength"
                value={gradient.strength}
                min={0}
                max={300}
                onChange={(strength) =>
                  onPatchAppearance({ gradient: { ...gradient, strength } })
                }
              />
              <SelectRow
                label="Style"
                value={gradient.style}
                options={GRADIENT_STYLES}
                onChange={(style: GradientStyle) => onPatchAppearance({ gradient: { ...gradient, style } })}
              />
              <SelectRow
                label="Blend mode"
                value={gradient.blend}
                options={BLEND_MODES}
                onChange={(blend: BlendMode) => onPatchAppearance({ gradient: { ...gradient, blend } })}
              />
              <SliderRow
                label="Offset X"
                value={gradient.offsetX}
                min={-100}
                max={100}
                onChange={(offsetX) => onPatchAppearance({ gradient: { ...gradient, offsetX } })}
              />
              <SliderRow
                label="Offset Y"
                value={gradient.offsetY}
                min={-100}
                max={100}
                onChange={(offsetY) => onPatchAppearance({ gradient: { ...gradient, offsetY } })}
              />
              <SliderRow
                label="Size X"
                value={gradient.sizeX}
                min={0}
                max={400}
                onChange={(sizeX) => onPatchAppearance({ gradient: { ...gradient, sizeX } })}
              />
              <SliderRow
                label="Size Y"
                value={gradient.sizeY}
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
                onChange={(color) => onPatchAppearance({ highlight: { ...highlight, color } })}
              />
              <SliderRow
                label="Opacity"
                value={highlight.opacity}
                min={0}
                max={100}
                onChange={(opacity) => onPatchAppearance({ highlight: { ...highlight, opacity } })}
              />
              <SelectRow
                label="Blend mode"
                value={highlight.blend}
                options={BLEND_MODES}
                onChange={(blend: BlendMode) => onPatchAppearance({ highlight: { ...highlight, blend } })}
              />
              <SliderRow
                label="Blur"
                value={highlight.blur}
                min={0}
                max={20}
                onChange={(blur) => onPatchAppearance({ highlight: { ...highlight, blur } })}
              />
            </>
          ) : null}

          {tab === 'card' ? (
            <>
              <ColorRow label="Color" value={a.card} onChange={(card) => onPatchAppearance({ card })} />
              <SelectRow
                label="Background"
                value={a.background}
                options={BACKGROUNDS}
                onChange={(background) => onPatchAppearance({ background })}
              />
              <SelectRow
                label="Texture"
                value={a.texture}
                options={TEXTURES}
                onChange={(texture) => onPatchAppearance({ texture })}
              />
            </>
          ) : null}
        </Group>

        <div className="px-3 pt-2">
          <button
            type="button"
            onClick={onReset}
            className="h-7 w-full rounded-md bg-black/[0.05] text-[12px] text-neutral-700 hover:bg-black/[0.09] dark:bg-white/[0.1] dark:text-neutral-200"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      <Footer dirty={dirty} onRevert={onRevert} onSave={onSave} />
    </>
  )
}
