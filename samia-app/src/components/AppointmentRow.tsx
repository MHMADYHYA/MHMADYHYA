import { Link } from 'react-router'
import type { AppointmentWithClient } from '../lib/database.types'
import { durationLabel, formatTime } from '../lib/dates'
import { SESSION_TYPE_LABELS } from '../lib/place'
import { isUnpaid } from '../lib/transitions'
import { ChevronLeftIcon, CoinsIcon, MapPinIcon, MessageIcon, UserIcon, VideoIcon } from './Icons'
import { StatusBadge } from './StatusBadge'

interface Props {
  appointment: AppointmentWithClient
  now: Date
  /** إظهار التاريخ بدل الساعة بس (بالقوائم اللي مش مجمّعة حسب اليوم) */
  showDate?: string
}

/** هل في رسالة إلغاء لسا ما انبعتت؟ */
export function hasPendingCancelMessage(a: AppointmentWithClient): boolean {
  return (a.outbox_messages ?? []).some((m) => m.kind === 'cancel' && !m.sent_at && !m.skipped_at)
}

/** هل في دعوة أو رسالة تغيير لسا ما انبعتت للزبون؟ */
export function hasUnsentInvite(a: AppointmentWithClient): boolean {
  return (a.outbox_messages ?? []).some(
    (m) => m.recipient === 'client' && (m.kind === 'invite' || m.kind === 'change') && !m.sent_at && !m.skipped_at,
  )
}

export function AppointmentRow({ appointment: a, now, showDate }: Props) {
  const unpaid = new Date(a.starts_at).getTime() <= now.getTime() && isUnpaid(a)
  const pendingCancel = hasPendingCancelMessage(a)
  const unsentInvite = a.status !== 'cancelled' && hasUnsentInvite(a)
  return (
    <Link
      to={`/appointments/${a.id}`}
      className="flex items-center gap-3 rounded-card border border-border bg-surface px-3.5 py-3 transition-colors hover:bg-page-tint/60"
    >
      <div className="w-16 shrink-0 text-center">
        {showDate && <p className="text-xs text-muted">{showDate}</p>}
        <p className="text-base font-semibold" dir="ltr">
          {formatTime(a.starts_at)}
        </p>
        <p className="text-xs text-muted">{durationLabel(a.duration_min)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{a.clients.full_name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={a.status} />
          <span className="inline-flex items-center gap-1 text-xs text-muted" title="نوع الجلسة">
            {a.session_type === 'in_person' ? <MapPinIcon width="15" height="15" /> : <VideoIcon width="15" height="15" />}
            {SESSION_TYPE_LABELS[a.session_type ?? 'zoom']}
          </span>
          {a.has_companion && (
            <span className="inline-flex items-center gap-1 text-xs text-muted" title="مع مرافق">
              <UserIcon width="16" height="16" />
              مرافق
            </span>
          )}
          {unpaid && (
            <span className="inline-flex items-center gap-1 rounded-full bg-coral-soft px-2 py-0.5 text-xs font-semibold text-coral-text">
              <CoinsIcon width="14" height="14" />
              ما اندفعت
            </span>
          )}
          {pendingCancel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-coral-soft px-2 py-0.5 text-xs font-semibold text-coral-text">
              <MessageIcon width="14" height="14" />
              رسالة الإلغاء لسا ما انبعتت
            </span>
          )}
          {!pendingCancel && unsentInvite && (
            <span className="inline-flex items-center gap-1 rounded-full bg-coral-soft px-2 py-0.5 text-xs font-semibold text-coral-text">
              <MessageIcon width="14" height="14" />
              رسالة لازم تنبعت
            </span>
          )}
        </div>
      </div>
      <ChevronLeftIcon className="shrink-0 text-muted" />
    </Link>
  )
}
