import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { PageTitle } from '../../components/Controls'
import { EmptyState, ErrorNotice, Spinner } from '../../components/Feedback'
import { CheckIcon, SendIcon, SkipIcon, UndoIcon } from '../../components/Icons'
import { useOutbox } from '../../hooks/queries'
import { useNow } from '../../hooks/useNow'
import type { OutboxWithAppointment } from '../../lib/database.types'
import { formatDateTime, formatTime, relativeDayLabel, timeAgoLabel } from '../../lib/dates'
import { formatPhoneForDisplay } from '../../lib/phone'
import { MESSAGE_KIND_LABELS, RECIPIENT_LABELS } from '../../lib/status'
import { reminderApplies } from '../../lib/transitions'
import { useSendMessage } from './useSendMessage'

function visible(m: OutboxWithAppointment): boolean {
  if (m.kind === 'reminder_day' || m.kind === 'reminder_hour') return reminderApplies(m.appointments.status)
  return true
}

function MessageCard({ m, now, children }: { m: OutboxWithAppointment; now: Date; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const recipientName = m.recipient === 'client' ? m.appointments.clients.full_name : (m.appointments.companion_name ?? 'المرافق')
  return (
    <li className="rounded-card border border-border bg-surface p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {MESSAGE_KIND_LABELS[m.kind]} · {RECIPIENT_LABELS[m.recipient]}
          </p>
          <p className="truncate text-sm text-muted">
            {recipientName} · <span dir="ltr">{formatPhoneForDisplay(m.to_phone)}</span>
          </p>
          <p className="text-sm text-muted">
            الجلسة: {relativeDayLabel(m.appointments.starts_at, now)} <span dir="ltr">{formatTime(m.appointments.starts_at)}</span>
            {m.recipient === 'companion' && ` · ${m.appointments.clients.full_name}`}
          </p>
        </div>
        <Link to={`/appointments/${m.appointment_id}`} className="shrink-0 text-sm text-primary underline-offset-4 hover:underline">
          الموعد
        </Link>
      </div>
      <button type="button" onClick={() => setOpen(!open)} className="mt-2 text-sm font-semibold text-primary">
        {open ? 'إخفاء النص' : 'اعرض النص'}
      </button>
      {open && <pre className="mt-2 whitespace-pre-wrap rounded-button bg-page-tint p-3 font-sans text-sm text-ink">{m.body}</pre>}
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </li>
  )
}

export function OutboxPage() {
  const now = useNow(30_000)
  const outbox = useOutbox(now)
  const { send, markSent, skip, unsend, busy } = useSendMessage()

  const groups = useMemo(() => {
    const pending = (outbox.data?.pending ?? []).filter(visible)
    const nowMs = now.getTime()
    return {
      cancel: pending.filter((m) => m.kind === 'cancel'),
      due: pending.filter((m) => m.kind !== 'cancel' && new Date(m.due_at).getTime() <= nowMs),
      later: pending.filter((m) => m.kind !== 'cancel' && new Date(m.due_at).getTime() > nowMs),
      recent: outbox.data?.recent ?? [],
    }
  }, [outbox.data, now])

  if (outbox.isPending) return <Spinner />
  if (outbox.isError) return <ErrorNotice message={(outbox.error as Error).message} onRetry={() => void outbox.refetch()} />

  const total = groups.cancel.length + groups.due.length + groups.later.length

  const actionButtons = (m: OutboxWithAppointment) => (
    <>
      <button type="button" disabled={busy} onClick={() => void send(m)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-button bg-primary px-4 font-semibold text-white disabled:opacity-50">
        <SendIcon width="18" height="18" />
        ابعت
      </button>
      <button type="button" disabled={busy} onClick={() => void markSent(m.id)} className="inline-flex min-h-11 items-center gap-1.5 rounded-button bg-primary-soft px-3 text-sm font-semibold text-primary disabled:opacity-50">
        <CheckIcon width="16" height="16" />
        تعلّمت كمبعوتة
      </button>
      <button type="button" disabled={busy} onClick={() => void skip(m.id)} className="inline-flex min-h-11 items-center gap-1.5 rounded-button px-3 text-sm font-semibold text-muted hover:bg-page-tint disabled:opacity-50">
        <SkipIcon width="16" height="16" />
        تخطّي
      </button>
    </>
  )

  const section = (title: string, items: OutboxWithAppointment[], tone?: 'coral') =>
    items.length > 0 && (
      <section className="space-y-2">
        <h2 className={`font-semibold ${tone === 'coral' ? 'text-coral-text' : ''}`}>
          {title} <span className="text-sm font-normal text-muted">({items.length})</span>
        </h2>
        <ul className="space-y-2">
          {items.map((m) => (
            <MessageCard key={m.id} m={m} now={now}>
              {actionButtons(m)}
            </MessageCard>
          ))}
        </ul>
      </section>
    )

  return (
    <div className="space-y-5">
      <PageTitle title="رسائل لازم تنبعت" subtitle={total === 0 ? undefined : `${total} رسالة بانتظارك`} />
      {total === 0 && <EmptyState text="كل الرسائل انبعتت" hint="لما يجي وقت تذكير أو تعيّني موعد جديد، بتطلع هون" />}
      {section('رسائل إلغاء', groups.cancel, 'coral')}
      {section('هلأ', groups.due)}
      {section('لاحقاً اليوم', groups.later)}

      {groups.recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-muted">انبعتت مؤخراً</h2>
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {groups.recent.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate">
                    <span className="font-semibold">{MESSAGE_KIND_LABELS[m.kind]}</span> · {RECIPIENT_LABELS[m.recipient]} ·{' '}
                    {m.recipient === 'client' ? m.appointments.clients.full_name : (m.appointments.companion_name ?? 'المرافق')}
                  </p>
                  <p className="text-xs text-muted">
                    {m.sent_at ? timeAgoLabel(m.sent_at, now) : ''} · الجلسة {formatDateTime(m.appointments.starts_at)}
                  </p>
                </div>
                <button type="button" disabled={busy} onClick={() => void unsend(m.id)} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-button px-2.5 text-sm font-semibold text-primary hover:bg-primary-soft">
                  <UndoIcon width="16" height="16" />
                  رجّعها
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
