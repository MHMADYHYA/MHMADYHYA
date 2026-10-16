import { useEffect, type ReactNode } from 'react'
import { XIcon } from './Icons'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

/** لوحة بتطلع من تحت عالتلفون وبالنص عالكمبيوتر */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <button type="button" aria-label="إغلاق" className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-card bg-surface shadow-raised sm:max-w-lg sm:rounded-card"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-page-tint"
          >
            <XIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  )
}

interface ConfirmSheetProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
}

export function ConfirmSheet({ open, onClose, onConfirm, title, message, confirmLabel = 'تأكيد', danger, busy }: ConfirmSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-button px-5 font-semibold text-white disabled:opacity-50 ${
              danger ? 'bg-coral-strong hover:bg-[#B04A34]' : 'bg-primary hover:bg-[#1A4252]'
            }`}
          >
            {busy ? 'لحظة...' : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-button bg-primary-soft px-5 font-semibold text-primary"
          >
            رجوع
          </button>
        </div>
      }
    >
      <div className="text-ink">{message}</div>
    </Sheet>
  )
}
