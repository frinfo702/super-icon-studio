import { Trash2 } from 'lucide-react'

/** The inspector's bottom bar: the delete button, for a view whose selection can go away. */
export function Footer({ onDelete }: { onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2 border-t border-black/[0.07] px-3 py-2.5 dark:border-white/[0.08]">
      <button
        type="button"
        title="Delete icon"
        aria-label="Delete icon"
        onClick={onDelete}
        className="grid size-7 shrink-0 place-items-center rounded-lg bg-black/[0.05] text-neutral-600 hover:bg-black/[0.09] dark:bg-white/[0.1] dark:text-neutral-300"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
