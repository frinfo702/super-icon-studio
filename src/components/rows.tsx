import { ChevronsUpDown, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { normalizeHex } from '../color'

/** A row shows this only while its value is away from the default it was given. */
function ResetValue({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      title="Reset to the default"
      aria-label="Reset to the default"
      onClick={onClick}
      // The negative margin keeps the hit area without squeezing the label next to it.
      className="-mr-1.5 grid size-4 shrink-0 place-items-center rounded text-neutral-400 hover:bg-black/[0.08] hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-white/[0.12] dark:hover:text-neutral-300"
    >
      <RotateCcw size={11} />
    </button>
  )
}

export function Section({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between px-3 pb-1.5 pt-3">
      <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{title}</span>
      {hint ? (
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{hint}</span>
      ) : null}
    </div>
  )
}

export function Group({ children }: { children: ReactNode }) {
  return (
    <div className="mx-3 divide-y divide-black/[0.06] overflow-hidden rounded-[10px] bg-black/[0.04] dark:divide-white/[0.06] dark:bg-white/[0.06]">
      {children}
    </div>
  )
}

export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`h-[20px] w-[34px] shrink-0 rounded-full p-[2px] transition-colors ${
        checked ? 'bg-[var(--accent)]' : 'bg-black/15 dark:bg-white/25'
      }`}
    >
      <span
        className={`block size-[16px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-transform ${
          checked ? 'translate-x-[14px]' : ''
        }`}
      />
    </button>
  )
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  decimals = 0,
  suffix = '%',
  def,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  decimals?: number
  suffix?: string
  /** The value Reset puts back, when the row has one. */
  def?: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex h-9 items-center gap-2.5 px-3">
      <span className="min-w-0 flex-1 truncate text-[13px]">{label}</span>
      <input
        type="range"
        className="slider w-[64px] shrink-0"
        style={{ '--fill': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="w-10 shrink-0 text-right text-[12px] tabular-nums text-neutral-500 dark:text-neutral-400">
        {value.toFixed(decimals)}
        {suffix}
      </span>
      {def !== undefined && value !== def ? <ResetValue onClick={() => onChange(def)} /> : null}
    </div>
  )
}

export function ToggleRow({
  label,
  checked,
  def,
  onChange,
}: {
  label: string
  checked: boolean
  /** The value Reset puts back, when the row has one. */
  def?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex h-9 items-center gap-3 px-3">
      <span className="flex-1 truncate text-[13px]">{label}</span>
      {def !== undefined && checked !== def ? <ResetValue onClick={() => onChange(def)} /> : null}
      <Switch checked={checked} onChange={onChange} />
    </div>
  )
}

export function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
  format,
  def,
}: {
  label: string
  value: T
  options: readonly T[]
  onChange: (v: T) => void
  format?: (v: T) => string
  /** The value Reset puts back, when the row has one. */
  def?: T
}) {
  return (
    <div className="flex h-9 items-center gap-3 px-3">
      <span className="flex-1 truncate text-[13px]">{label}</span>
      <div className="relative shrink-0">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="appearance-none rounded-md bg-black/[0.06] py-[3px] pl-2 pr-6 text-[12px] text-neutral-800 dark:bg-white/[0.12] dark:text-neutral-200"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {format ? format(option) : option}
            </option>
          ))}
        </select>
        <ChevronsUpDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
      </div>
      {def !== undefined && value !== def ? <ResetValue onClick={() => onChange(def)} /> : null}
    </div>
  )
}

export function ColorRow({
  label,
  value,
  def,
  onChange,
}: {
  label: string
  value: string
  def?: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex h-9 items-center gap-3 px-3">
      <span className="flex-1 truncate text-[13px]">{label}</span>
      <input
        key={value}
        defaultValue={value}
        spellCheck={false}
        onBlur={(event) => {
          const next = normalizeHex(event.target.value)
          if (next) onChange(next)
          else event.target.value = value
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        className="w-[76px] shrink-0 rounded-md bg-black/[0.06] px-2 py-[3px] text-center text-[12px] tabular-nums text-neutral-800 outline-none focus:ring-2 focus:ring-[var(--accent)] dark:bg-white/[0.12] dark:text-neutral-200"
      />
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="size-[22px] shrink-0 cursor-default rounded-full border border-black/10 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 dark:border-white/20"
      />
      {def !== undefined && value.toUpperCase() !== def.toUpperCase() ? (
        <ResetValue onClick={() => onChange(def)} />
      ) : null}
    </div>
  )
}

export function TextRow({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex h-9 items-center gap-3 px-3">
      <span className="flex-1 truncate text-[13px]">{label}</span>
      <input
        value={value}
        spellCheck={false}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: `${Math.max(4, value.length) + 2}ch` }}
        className="shrink-0 rounded-md bg-black/[0.06] px-2 py-[3px] text-center text-[12px] text-neutral-800 outline-none focus:bg-white focus:ring-2 focus:ring-[var(--accent)] dark:bg-white/[0.12] dark:text-neutral-200 dark:focus:bg-white/20"
      />
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  tone = 'accent',
}: {
  value: T
  options: { value: T; label?: string; icon?: ReactNode; disabled?: boolean; title?: string }[]
  onChange: (v: T) => void
  tone?: 'accent' | 'neutral'
}) {
  return (
    <div className="flex gap-0.5 rounded-[9px] bg-black/[0.06] p-[3px] dark:bg-white/[0.1]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={option.disabled}
          title={option.title}
          aria-label={option.title}
          onClick={() => onChange(option.value)}
          className={`flex h-[22px] items-center justify-center gap-1.5 rounded-[7px] text-[12px] transition-colors disabled:opacity-40 ${
            option.label ? 'px-2.5' : 'w-[34px]'
          } ${
            value === option.value
              ? tone === 'accent'
                ? 'bg-[var(--accent)] font-medium text-white shadow-sm'
                : 'bg-white font-medium text-neutral-800 shadow-sm dark:bg-white/25 dark:text-white'
              : 'text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10'
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean
  onClick?: () => void
  title: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`grid size-[26px] place-items-center rounded-[7px] transition-colors ${
        active
          ? 'bg-black/[0.08] text-neutral-800 dark:bg-white/[0.16] dark:text-white'
          : 'text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}
