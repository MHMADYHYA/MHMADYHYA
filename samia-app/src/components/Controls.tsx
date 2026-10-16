import type { ReactNode } from 'react'

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

/** مفتاح التبديل (يومي / أسبوعي / قائمة) بخلفية page-tint */
export function Segmented<T extends string>({ options, value, onChange, ariaLabel }: SegmentedProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex rounded-button bg-page-tint p-1">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`min-h-9 rounded-[10px] px-3.5 text-sm font-semibold transition-colors ${
              active ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** شارة رقم بلون كورال غامق ونص أبيض */
export function CountBadge({ count, className = '' }: { count: number; className?: string }) {
  if (!count) return null
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral-strong px-1.5 text-xs font-semibold text-white ${className}`}
      dir="ltr"
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

interface PageTitleProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageTitle({ title, subtitle, action }: PageTitleProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/** صف معلومات: عنوان صغير وقيمة */
export function InfoRow({ label, children, icon }: { label: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {icon && <span className="mt-0.5 text-muted">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <div className="text-ink">{children}</div>
      </div>
    </div>
  )
}

/** مجموعة أزرار اختيار (مثل طريقة الدفع) */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[]
  value: T | null
  onChange: (v: T) => void
  ariaLabel: string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`min-h-11 rounded-button border px-4 font-semibold transition-colors ${
              active ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-ink hover:bg-page-tint'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
