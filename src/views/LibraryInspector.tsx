import { Footer } from '../components/Footer'
import { Glyph, IconCard } from '../components/IconCard'
import { Group, Section, TextRow } from '../components/rows'
import type { IconDef, Mode } from '../model'
import { hasOwnColours } from '../svg'

type Props = {
  icon: IconDef | undefined
  mode: Mode
  onPatch: (patch: Partial<IconDef>) => void
  onReplaceSvg: () => void
  onMergeColours: () => void
  onDelete: () => void
}

export function LibraryInspector({ icon, mode, onPatch, onReplaceSvg, onMergeColours, onDelete }: Props) {
  if (!icon) {
    return (
      <div className="grid flex-1 place-items-center px-8 text-center text-[12px] leading-relaxed text-neutral-400 dark:text-neutral-500">
        Select an icon in Library to inspect its glyph and artwork.
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto pb-2">
        <div className="p-3">
          <div className="grid h-[104px] place-items-center rounded-[10px] bg-black/[0.04] dark:bg-white/[0.06]">
            <IconCard icon={icon} mode={mode} size={64} />
          </div>
        </div>

        <Section title="Details" />
        <Group>
          <TextRow label="Name" value={icon.name} onChange={(name) => onPatch({ name })} />
          <div className="flex h-11 items-center gap-3 px-3">
            <span className="flex-1 text-[13px]">Glyph</span>
            <span className="grid size-8 place-items-center rounded-lg bg-black/[0.06] text-neutral-700 dark:bg-white/[0.1] dark:text-neutral-200">
              <Glyph icon={icon} size={16} color="currentColor" />
            </span>
          </div>
          <TextRow
            label="Identifier"
            value={icon.identifier}
            onChange={(identifier) => onPatch({ identifier })}
          />
          <div className="flex gap-1.5 px-3 py-2">
            <button
              type="button"
              onClick={onReplaceSvg}
              className="h-7 flex-1 rounded-md bg-black/[0.05] text-[12px] text-neutral-700 hover:bg-black/[0.09] dark:bg-white/[0.1] dark:text-neutral-200"
            >
              {icon.artwork ? 'Replace SVG…' : 'Import SVG…'}
            </button>
            {icon.artwork ? (
              <button
                type="button"
                title="Go back to the bundled glyph"
                onClick={() => onPatch({ artwork: undefined })}
                className="h-7 flex-1 rounded-md bg-black/[0.05] text-[12px] text-neutral-700 hover:bg-black/[0.09] dark:bg-white/[0.1] dark:text-neutral-200"
              >
                Built-in glyph
              </button>
            ) : null}
          </div>
          {icon.artwork && hasOwnColours(icon.artwork.paths) ? (
            <div className="flex px-3 pb-2">
              <button
                type="button"
                title="Draw every layer in the glyph colour, so light and dark each tint the drawing"
                onClick={onMergeColours}
                className="h-7 flex-1 rounded-md bg-black/[0.05] text-[12px] text-neutral-700 hover:bg-black/[0.09] dark:bg-white/[0.1] dark:text-neutral-200"
              >
                Merge to one colour
              </button>
            </div>
          ) : null}
        </Group>
      </div>

      <Footer onDelete={onDelete} />
    </>
  )
}
