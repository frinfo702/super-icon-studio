import { IconCard } from '../components/IconCard'
import type { IconDef, Mode } from '../model'

type Props = {
  icons: IconDef[]
  selectedId: string
  mode: Mode
  zoom: number
  onSelect: (id: string) => void
}

export function Library({ icons, selectedId, mode, zoom, onSelect }: Props) {
  const cell = Math.round(64 * zoom)

  return (
    <div className="px-4 pb-24 pt-2">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.round(84 * zoom)}px, 1fr))` }}
      >
        {icons.map((icon) => (
          <button
            key={icon.id}
            onClick={() => onSelect(icon.id)}
            className={`flex flex-col items-center gap-2 rounded-[10px] p-2 transition-colors ${
              icon.id === selectedId
                ? 'bg-white ring-2 ring-[var(--accent)] dark:bg-white/10'
                : 'bg-black/[0.035] hover:bg-black/[0.06] dark:bg-white/[0.06] dark:hover:bg-white/[0.09]'
            }`}
          >
            <IconCard icon={icon} mode={mode} size={cell} />
            <span className="w-full truncate text-center text-[11px] text-neutral-600 dark:text-neutral-400">
              {icon.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
