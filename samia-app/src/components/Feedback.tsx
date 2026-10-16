import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { ButterflyMark } from './ButterflyMark'
import { AlertCircleIcon, CheckCircleIcon, InfoIcon } from './Icons'

/** القوائم الفاضية إلها رسالة لطيفة مع فراشة باهتة */
export function EmptyState({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <ButterflyMark size={64} className="opacity-25" title="" />
      <p className="mt-3 text-muted">{text}</p>
      {hint && <p className="mt-1 text-sm text-muted/80">{hint}</p>}
    </div>
  )
}

export function Spinner({ label = 'لحظة...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-card bg-coral-soft p-4 text-coral-text" role="alert">
      <AlertCircleIcon className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p>{message}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-2 font-semibold underline underline-offset-4">
            جرّب مرة ثانية
          </button>
        )}
      </div>
    </div>
  )
}

/** تنبيه لطيف بخلفية كورال فاتح */
export function SoftNotice({ children, tone = 'coral' }: { children: ReactNode; tone?: 'coral' | 'primary' }) {
  const classes = tone === 'coral' ? 'bg-coral-soft text-coral-text' : 'bg-primary-soft text-primary'
  return (
    <div className={`flex items-start gap-3 rounded-card p-3.5 text-sm ${classes}`}>
      <InfoIcon className="mt-0.5 shrink-0" />
      <div className="flex-1 leading-relaxed">{children}</div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Toast
// -----------------------------------------------------------------------------
export interface ToastOptions {
  message: string
  variant?: 'default' | 'success' | 'error'
  action?: { label: string; onClick: () => void }
  durationMs?: number
}

interface ToastItem extends ToastOptions {
  id: number
}

const ToastContext = createContext<(options: ToastOptions) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = ++counter.current
      setItems((list) => [...list.slice(-2), { ...options, id }])
      const duration = options.durationMs ?? (options.action ? 8000 : 3500)
      window.setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  const value = useMemo(() => toast, [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-card px-4 py-3 shadow-raised ${
              t.variant === 'error'
                ? 'bg-coral-soft text-coral-text'
                : t.variant === 'success'
                  ? 'bg-status-confirmed text-status-confirmed-fg'
                  : 'bg-ink text-white'
            }`}
          >
            {t.variant === 'success' ? <CheckCircleIcon className="shrink-0" /> : t.variant === 'error' ? <AlertCircleIcon className="shrink-0" /> : null}
            <span className="flex-1 text-sm">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick()
                  dismiss(t.id)
                }}
                className="min-h-9 rounded-button px-3 text-sm font-semibold underline underline-offset-4"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
