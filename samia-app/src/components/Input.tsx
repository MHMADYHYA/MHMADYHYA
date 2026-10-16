import type { ComponentProps } from 'react'

const BASE =
  'w-full min-h-11 rounded-button border bg-surface px-3.5 text-base text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-page-tint disabled:text-muted'

export function inputClasses(invalid?: boolean, extra = ''): string {
  return `${BASE} ${invalid ? 'border-coral-strong' : 'border-border'} ${extra}`
}

interface InputProps extends ComponentProps<'input'> {
  invalid?: boolean
}

export function Input({ invalid, className = '', ...props }: InputProps) {
  return <input className={inputClasses(invalid, className)} {...props} />
}

interface TextareaProps extends ComponentProps<'textarea'> {
  invalid?: boolean
}

export function Textarea({ invalid, className = '', rows = 3, ...props }: TextareaProps) {
  return <textarea rows={rows} className={inputClasses(invalid, `py-2.5 leading-relaxed ${className}`)} {...props} />
}

interface SelectProps extends ComponentProps<'select'> {
  invalid?: boolean
}

export function Select({ invalid, className = '', children, ...props }: SelectProps) {
  return (
    <select className={inputClasses(invalid, `appearance-none pe-9 ${className}`)} {...props}>
      {children}
    </select>
  )
}

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: string
  error?: string | null
  children: React.ReactNode
  className?: string
}

export function Field({ label, htmlFor, hint, error, children, className = '' }: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-coral-text" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  id?: string
  disabled?: boolean
}

/** مفتاح تشغيل/إطفاء بحجم مريح للإصبع */
export function Toggle({ checked, onChange, label, description, id, disabled }: ToggleProps) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center justify-between gap-4 py-1">
      <span>
        <span className="block font-semibold">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? 'bg-primary' : 'bg-border'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'start-6' : 'start-1'
          }`}
        />
      </button>
    </label>
  )
}
