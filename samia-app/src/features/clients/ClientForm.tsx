import { useState, type FormEvent } from 'react'
import { Button } from '../../components/Button'
import { ErrorNotice, SoftNotice } from '../../components/Feedback'
import { Field, Input, Textarea } from '../../components/Input'
import type { ClientInput } from '../../lib/api'
import type { ClientRow } from '../../lib/database.types'
import { formatPhoneForDisplay, normalizePhone } from '../../lib/phone'

interface Props {
  initial?: ClientRow | null
  busy?: boolean
  error?: string | null
  submitLabel?: string
  onSubmit: (input: ClientInput) => void
  onCancel?: () => void
}

export function ClientForm({ initial, busy, error, submitLabel = 'احفظ', onSubmit, onCancel }: Props) {
  const [fullName, setFullName] = useState(initial?.full_name ?? '')
  const [phone, setPhone] = useState(initial ? formatPhoneForDisplay(initial.phone) : '')
  const [companionName, setCompanionName] = useState(initial?.default_companion_name ?? '')
  const [companionPhone, setCompanionPhone] = useState(
    initial?.default_companion_phone ? formatPhoneForDisplay(initial.default_companion_phone) : '',
  )
  const [price, setPrice] = useState(initial?.default_price != null ? String(initial.default_price) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [localError, setLocalError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (!fullName.trim()) return setLocalError('اكتب اسم الزبون')
    const p = normalizePhone(phone)
    if (!p.ok) return setLocalError(p.error)
    let companion: string | null = null
    if (companionPhone.trim()) {
      const cp = normalizePhone(companionPhone)
      if (!cp.ok) return setLocalError(`رقم المرافق: ${cp.error}`)
      companion = cp.phone
    }
    const priceNum = price.trim() === '' ? null : Number(price)
    if (priceNum !== null && (Number.isNaN(priceNum) || priceNum < 0)) return setLocalError('السعر لازم يكون رقم')
    onSubmit({
      full_name: fullName.trim(),
      phone: p.phone,
      default_companion_name: companionName.trim() || null,
      default_companion_phone: companion,
      default_price: priceNum,
      notes: notes.trim() || null,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="الاسم الكامل" htmlFor="client-name">
        <Input id="client-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="off" required />
      </Field>
      <Field label="رقم الواتساب" htmlFor="client-phone" hint="مثال: 0501234567">
        <Input
          id="client-phone"
          type="tel"
          inputMode="tel"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="off"
          required
        />
      </Field>
      <fieldset className="space-y-3 rounded-card border border-border p-3.5">
        <legend className="px-1 text-sm font-semibold text-muted">مرافق افتراضي (اختياري)</legend>
        <Field label="اسم المرافق" htmlFor="client-companion-name">
          <Input id="client-companion-name" value={companionName} onChange={(e) => setCompanionName(e.target.value)} />
        </Field>
        <Field label="رقم المرافق" htmlFor="client-companion-phone">
          <Input
            id="client-companion-phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            value={companionPhone}
            onChange={(e) => setCompanionPhone(e.target.value)}
          />
        </Field>
      </fieldset>
      <Field label="سعر الجلسة الافتراضي (₪)" htmlFor="client-price" hint="إذا فاضي بينستعمل السعر العام من الإعدادات">
        <Input id="client-price" type="number" inputMode="decimal" min="0" step="1" dir="ltr" value={price} onChange={(e) => setPrice(e.target.value)} />
      </Field>
      <Field label="ملاحظات" htmlFor="client-notes">
        <Textarea id="client-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <SoftNotice>الملاحظات للأمور التنظيمية بس (مواعيد مفضّلة، طريقة تواصل)، مش لملاحظات علاجية.</SoftNotice>
      {(localError || error) && <ErrorNotice message={localError ?? error ?? ''} />}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={busy}>
          {busy ? 'لحظة...' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            رجوع
          </Button>
        )}
      </div>
    </form>
  )
}
