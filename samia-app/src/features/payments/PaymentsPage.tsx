import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { PageTitle } from '../../components/Controls'
import { EmptyState, ErrorNotice, Spinner, useToast } from '../../components/Feedback'
import { ChevronLeftIcon, ChevronRightIcon, UndoIcon } from '../../components/Icons'
import { usePayable, useUpdateAppointment } from '../../hooks/queries'
import { useNow } from '../../hooks/useNow'
import type { AppointmentWithClient } from '../../lib/database.types'
import { addMonthsApp, formatDateTime, formatMonthYear, formatShortDayDate, startOfMonthApp, timeAgoLabel } from '../../lib/dates'
import { toArabicError } from '../../lib/errors'
import { formatMoney, monthSummary, unpaidAppointments } from '../../lib/payments'
import { PAYMENT_METHOD_LABELS, STATUS_LABELS } from '../../lib/status'
import { PaymentSheet } from '../appointments/AppointmentSheets'

export function PaymentsPage() {
  const now = useNow()
  const toast = useToast()
  const since = useMemo(() => addMonthsApp(startOfMonthApp(now), -13), [now])
  const payable = usePayable(since)
  const update = useUpdateAppointment()
  const [month, setMonth] = useState<Date>(() => startOfMonthApp(new Date()))
  const [paying, setPaying] = useState<AppointmentWithClient | null>(null)

  const summary = useMemo(() => monthSummary(payable.data ?? [], month), [payable.data, month])
  const unpaid = useMemo(() => unpaidAppointments(payable.data ?? []), [payable.data])
  const recentPaid = useMemo(
    () =>
      (payable.data ?? [])
        .filter((a) => a.payment_status === 'paid' && a.paid_at)
        .sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''))
        .slice(0, 10),
    [payable.data],
  )

  if (payable.isPending) return <Spinner />
  if (payable.isError) return <ErrorNotice message={(payable.error as Error).message} onRetry={() => void payable.refetch()} />

  const isCurrentMonth = startOfMonthApp(now).getTime() === month.getTime()

  return (
    <div className="space-y-5">
      <PageTitle title="الدفعات" />

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="الشهر السابق" onClick={() => setMonth(addMonthsApp(month, -1))} className="flex h-10 w-10 items-center justify-center rounded-button hover:bg-page-tint">
            <ChevronRightIcon />
          </button>
          <h2 className="font-semibold">{formatMonthYear(month)}</h2>
          <button
            type="button"
            aria-label="الشهر التالي"
            disabled={isCurrentMonth}
            onClick={() => setMonth(addMonthsApp(month, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-button hover:bg-page-tint disabled:opacity-30"
          >
            <ChevronLeftIcon />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-card bg-status-confirmed p-3.5 text-status-confirmed-fg">
            <p className="text-sm">وصل</p>
            <p className="text-2xl font-semibold">{formatMoney(summary.received)}</p>
            <p className="text-xs opacity-80">{summary.receivedCount} جلسة</p>
          </div>
          <div className="rounded-card bg-coral-soft p-3.5 text-coral-text">
            <p className="text-sm">لسا ما اندفع</p>
            <p className="text-2xl font-semibold">{formatMoney(summary.outstanding)}</p>
            <p className="text-xs opacity-80">{summary.outstandingCount} جلسة</p>
          </div>
        </div>
        <p className="text-xs text-muted">الحساب حسب تاريخ الجلسة. الجلسات اللي بدون سعر أو "بدون دفع" ما بتنحسب.</p>
      </Card>

      <section className="space-y-2">
        <h2 className="font-semibold">
          ما اندفعت <span className="text-sm font-normal text-muted">({unpaid.length})</span>
        </h2>
        {unpaid.length === 0 ? (
          <EmptyState text="كل الجلسات مدفوعة" />
        ) : (
          <ul className="space-y-2">
            {unpaid.map((a) => (
              <li key={a.id} className="space-y-3 rounded-card border border-border bg-surface p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/appointments/${a.id}`} className="font-semibold text-primary underline-offset-4 hover:underline">
                      {a.clients.full_name}
                    </Link>
                    <p className="text-sm text-muted">
                      {formatShortDayDate(a.starts_at)} · {STATUS_LABELS[a.status]}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg font-semibold">{formatMoney(a.price)}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setPaying(a)}>دفع</Button>
                  <Button
                    variant="secondary"
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate(
                        { id: a.id, patch: { payment_status: 'waived' } },
                        { onSuccess: () => toast({ message: 'انحفظت كجلسة بدون دفع.' }), onError: (err) => toast({ message: toArabicError(err), variant: 'error' }) },
                      )
                    }
                  >
                    بدون دفع
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recentPaid.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-muted">اندفعت مؤخراً</h2>
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {recentPaid.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate">
                    <span className="font-semibold">{a.clients.full_name}</span> · {formatMoney(a.price)}
                    {a.payment_method && ` · ${PAYMENT_METHOD_LABELS[a.payment_method]}`}
                  </p>
                  <p className="text-xs text-muted">
                    {a.paid_at ? timeAgoLabel(a.paid_at, now) : ''} · الجلسة {formatDateTime(a.starts_at)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate(
                      { id: a.id, patch: { payment_status: 'unpaid' } },
                      { onSuccess: () => toast({ message: 'رجّعناها لغير مدفوعة.' }), onError: (err) => toast({ message: toArabicError(err), variant: 'error' }) },
                    )
                  }
                  className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-button px-2.5 text-sm font-semibold text-primary hover:bg-primary-soft"
                >
                  <UndoIcon width="16" height="16" />
                  تراجع
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {paying && <PaymentSheet appointment={paying} open onClose={() => setPaying(null)} />}
    </div>
  )
}
