import { Trash2 } from 'lucide-react'

export function Footer({
  dirty,
  onDelete,
  onRevert,
  onSave,
}: {
  dirty: boolean
  onDelete?: () => void
  onRevert: () => void
  onSave: () => void
}) {
  return (
    <div className="flex items-center gap-2 border-t border-black/[0.07] px-3 py-2.5 dark:border-white/[0.08]">
      {onDelete ? (
        <button
          type="button"
          title="Delete icon"
          aria-label="Delete icon"
          onClick={onDelete}
          className="grid size-7 shrink-0 place-items-center rounded-lg bg-black/[0.05] text-neutral-600 hover:bg-black/[0.09] dark:bg-white/[0.1] dark:text-neutral-300"
        >
          <Trash2 size={14} />
        </button>
      ) : null}
      <button
        type="button"
        disabled={!dirty}
        onClick={onRevert}
        className="h-7 flex-1 rounded-lg bg-black/[0.05] text-[12px] font-medium text-neutral-700 enabled:hover:bg-black/[0.09] disabled:opacity-40 dark:bg-white/[0.1] dark:text-neutral-200"
      >
        Revert
      </button>
      <button
        type="button"
        disabled={!dirty}
        onClick={onSave}
        className="h-7 flex-1 rounded-lg bg-[var(--accent)] text-[12px] font-medium text-white enabled:hover:brightness-105 disabled:opacity-40"
      >
        Save
      </button>
    </div>
  )
}
