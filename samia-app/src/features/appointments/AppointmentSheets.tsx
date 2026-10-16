import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { ChoiceChips } from '../../components/Controls'
import { ErrorNotice, SoftNotice, useToast } from '../../components/Feedback'
import { Field, Input, Select, Textarea } from '../../components/Input'
import { Sheet } from '../../components/Sheet'
import { StatusBadge } from '../../components/StatusBadge'
import { useInvalidateAll, useUpdateAppointment } from '../../hooks/queries'
import type { AppointmentStatus, AppointmentWithClient, PaymentMethod, SettingsRow } from '../../lib/database.types'
import { combineDateAndTime, dayKey, formatDateTime, splitWallClock } from '../../lib/dates'
import { toArabicError } from '../../lib/errors'
import { formatMoney } from '../../lib/payments'
import { APPOINTMENT_STATUSES, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, STATUS_LABELS } from '../../lib/status'
import { cancelFlow, rescheduleFlow } from './flows'
import { TIME_OPTIONS } from './NewAppointmentPage'

interface BaseProps {
  appointment: AppointmentWithClient
  open: boolean
  onClose: () => void
}

export function RescheduleSheet({ appointment: a, settings, open, onClose }: BaseProps & { settings: SettingsRow }) {
  const toast = useToast()
  const invalidateAll = useInvalidateAll()
  const initial = splitWallClock(a.starts_at)
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const [duration, setDuration] = useState(String(a.duration_min))
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const startsAt = combineDateAndTime(date, time)
      if (!startsAt) throw new Error('التاريخ أو الساعة مش صالحين')
      const durationMin = Number(duration)
      if (!Number.isInteger(durationMin) || durationMin < 5 || durationMin > 480) throw new Error('المدة لازم تكون بين 5 و480 دقيقة')
      return rescheduleFlow(a, startsAt, durationMin, settings, new Date())
    },
    onSuccess: (result) => {
      invalidateAll()
      toast({ message: 'تغيّر الموعد وانجهّزت رسالة التغيير.', variant: 'success' })
      if (result.warning) toast({ message: result.warning, variant: 'error', durationMs: 7000 })
      onClose()
    },
    onError: (err) => setError(toArabicError(err)),
  })

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="غيّر الموعد"
      footer={
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'بنغيّر...' : 'غيّر الموعد'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            رجوع
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          الموعد الحالي: <span className="font-semibold text-ink">{formatDateTime(a.starts_at)}</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="التاريخ الجديد" htmlFor="re-date">
            <Input id="re-date" type="date" dir="ltr" value={date} min={dayKey(new Date())} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="الساعة" htmlFor="re-time">
            <Select id="re-time" dir="ltr" value={time} onChange={(e) => setTime(e.target.value)}>
              {!TIME_OPTIONS.includes(time) && <option value={time}>{time}</option>}
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="المدة (دقايق)" htmlFor="re-duration">
          <Input id="re-duration" type="number" min={5} max={480} step={5} dir="ltr" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </Field>
        <SoftNotice tone="primary">
          بعد التغيير الحالة بترجع "بانتظار رد"، وكل الرسائل القديمة غير المبعوتة بتنشال وبتنعمل رسالة تغيير وتذكيرات جديدة.
        </SoftNotice>
        {error && <ErrorNotice message={error} />}
      </div>
    </Sheet>
  )
}

export function CancelSheet({
  appointment: a,
  settings,
  open,
  onClose,
  onCancelled,
  andNew,
}: BaseProps & { settings: SettingsRow; onCancelled: (andNew: boolean) => void; andNew: boolean }) {
  const toast = useToast()
  const invalidateAll = useInvalidateAll()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => cancelFlow(a, reason, settings, new Date()),
    onSuccess: (result) => {
      invalidateAll()
      toast({ message: 'انلغى الموعد وانجهّزت رسالة الإلغاء.', variant: 'success' })
      if (result.warning) toast({ message: result.warning, variant: 'error', durationMs: 7000 })
      onClose()
      onCancelled(andNew)
    },
    onError: (err) => setError(toArabicError(err)),
  })

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={andNew ? 'ألغي وعيّن جديد' : 'إلغاء الموعد'}
      footer={
        <div className="flex gap-2">
          <Button className="flex-1 bg-coral-strong hover:bg-[#B04A34] active:bg-[#9B4230]" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'بنلغي...' : andNew ? 'ألغي وافتح موعد جديد' : 'ألغي الموعد'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            رجوع
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p>
          رح نلغي جلسة <span className="font-semibold">{a.clients.full_name}</span> يوم {formatDateTime(a.starts_at)}.
        </p>
        <Field label="السبب (اختياري، بيظهر برسالة الزبون)" htmlFor="cancel-reason">
          <Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        </Field>
        {error && <ErrorNotice message={error} />}
      </div>
    </Sheet>
  )
}

export function StatusSheet({ appointment: a, open, onClose }: BaseProps) {
  const update = useUpdateAppointment()
  const toast = useToast()
  const [status, setStatus] = useState<AppointmentStatus>(a.status)
  const [error, setError] = useState<string | null>(null)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="غيّر الحالة يدوياً"
      footer={
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={update.isPending || status === a.status}
            onClick={() =>
              update.mutate(
                { id: a.id, patch: { status } },
                {
                  onSuccess: () => {
                    toast({ message: `الحالة صارت "${STATUS_LABELS[status]}".`, variant: 'success' })
                    onClose()
                  },
                  onError: (err) => setError(toArabicError(err)),
                },
              )
            }
          >
            {update.isPending ? 'لحظة...' : 'احفظ'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            رجوع
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted">
          الحالة الحالية: <StatusBadge status={a.status} />
        </p>
        <div className="space-y-2">
          {APPOINTMENT_STATUSES.map((s) => (
            <label key={s} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-button border border-border px-3.5 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
              <input type="radio" name="status" value={s} checked={status === s} onChange={() => setStatus(s)} className="accent-primary" />
              <StatusBadge status={s} />
            </label>
          ))}
        </div>
        <SoftNotice>التغيير اليدوي ما بيبعت أي رسالة للزبون. لتغيير الوقت أو الإلغاء مع رسالة، استعمل الأزرار المخصصة.</SoftNotice>
        {error && <ErrorNotice message={error} />}
      </div>
    </Sheet>
  )
}

export function PaymentSheet({ appointment: a, open, onClose }: BaseProps) {
  const update = useUpdateAppointment()
  const toast = useToast()
  const [method, setMethod] = useState<PaymentMethod | null>(a.payment_method)
  const [price, setPrice] = useState(a.price == null ? '' : String(a.price))
  const [error, setError] = useState<string | null>(null)

  function save(paymentStatus: 'paid' | 'waived') {
    setError(null)
    const priceNum = price.trim() === '' ? null : Number(price)
    if (priceNum !== null && (Number.isNaN(priceNum) || priceNum < 0)) return setError('السعر لازم يكون رقم')
    if (paymentStatus === 'paid' && !method) return setError('اختار طريقة الدفع')
    update.mutate(
      { id: a.id, patch: { payment_status: paymentStatus, payment_method: paymentStatus === 'paid' ? method : null, price: priceNum } },
      {
        onSuccess: () => {
          toast({ message: paymentStatus === 'paid' ? `انحفظ الدفع (${PAYMENT_METHOD_LABELS[method!]}).` : 'انحفظت كجلسة بدون دفع.', variant: 'success' })
          onClose()
        },
        onError: (err) => setError(toArabicError(err)),
      },
    )
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="الدفع"
      footer={
        <div className="flex flex-col gap-2">
          <Button className="w-full" disabled={update.isPending} onClick={() => save('paid')}>
            {update.isPending ? 'لحظة...' : `دفع ${price ? formatMoney(Number(price)) : ''}`}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" disabled={update.isPending} onClick={() => save('waived')}>
              بدون دفع
            </Button>
            <Button variant="ghost" onClick={onClose}>
              رجوع
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          جلسة <span className="font-semibold text-ink">{a.clients.full_name}</span>، {formatDateTime(a.starts_at)}
        </p>
        <Field label="السعر (₪)" htmlFor="pay-price">
          <Input id="pay-price" type="number" inputMode="decimal" min={0} step={1} dir="ltr" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="طريقة الدفع">
          <ChoiceChips
            ariaLabel="طريقة الدفع"
            value={method}
            onChange={setMethod}
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))}
          />
        </Field>
        {error && <ErrorNotice message={error} />}
      </div>
    </Sheet>
  )
}
