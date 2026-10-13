import { IconCard } from '../components/IconCard'
import { IconFrame } from '../components/IconFrame'
import { TILE_CAP, type IconDef, type Mode } from '../model'

type Props = {
  icon: IconDef | undefined
  mode: Mode
  sizes: number[]
  size: number
  zoom: number
  layout: 'hero' | 'grid'
  onSizeChange: (size: number) => void
}

export function Design({ icon, mode, sizes, size, zoom, layout, onSizeChange }: Props) {
  if (!icon) return null

  if (layout === 'grid') {
    return (
      <div className="grid h-full place-content-center gap-6 px-4 pb-24 pt-16">
        <div className="grid grid-cols-3 gap-6">
          {sizes.map((value) => (
            <div key={value} className="flex min-h-[132px] flex-col items-center justify-center gap-2">
              <IconFrame
                icon={icon}
                mode={mode}
                size={Math.min(Math.max(value * 2.5, 20), 108)}
                selected={value === size}
              />
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{value} pt</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="grid flex-1 place-items-center pb-8 pt-14">
        <IconCard icon={icon} mode={mode} size={Math.round(size * zoom)} />
      </div>
      <div className="overflow-x-auto pb-16">
        <div className="mx-auto flex w-max items-end gap-3 px-6">
          {sizes.map((value) => (
            <button
              key={value}
              onClick={() => onSizeChange(value)}
              className="flex min-w-16 flex-col items-center gap-1"
            >
              {value <= TILE_CAP ? (
                <IconFrame icon={icon} mode={mode} size={value} selected={value === size} />
              ) : (
                <span
                  title={`${value} pt — too large to show at true size`}
                  className={`grid size-[128px] place-items-center rounded-[10px] text-[13px] font-medium tabular-nums ${
                    value === size
                      ? 'text-[var(--accent)] ring-2 ring-[var(--accent)]'
                      : 'text-neutral-500 ring-1 ring-black/10 dark:text-neutral-400 dark:ring-white/15'
                  }`}
                >
                  {value}
                </span>
              )}
              <span
                className={`text-[10px] ${
                  value === size
                    ? 'font-medium text-[var(--accent)]'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {value}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
