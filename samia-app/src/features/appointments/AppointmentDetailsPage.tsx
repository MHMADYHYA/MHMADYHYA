import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { InfoRow } from '../../components/Controls'
import { EmptyState, ErrorNotice, SoftNotice, Spinner, useToast } from '../../components/Feedback'
import {
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  CoinsIcon,
  CopyIcon,
  ExternalLinkIcon,
  MessageIcon,
  NoteIcon,
  PhoneIcon,
  SendIcon,
  SkipIcon,
  UserIcon,
  VideoIcon,
} from '../../components/Icons'
import { Textarea } from '../../components/Input'
import { StatusBadge } from '../../components/StatusBadge'
import { useAppointment, useAppointmentEvents, useAppointmentMessages, useSettings, useUpdateAppointment } from '../../hooks/queries'
import { useNow } from '../../hooks/useNow'
import type { AppointmentEventRow, OutboxMessageRow } from '../../lib/database.types'
import { durationLabel, formatDateTime, formatDayAndDate, formatTime, relativeDayLabel, timeAgoLabel } from '../../lib/dates'
import { toArabicError } from '../../lib/errors'
import { formatMoney } from '../../lib/payments'
import { formatPhoneForDisplay } from '../../lib/phone'
import {
  ACTOR_LABELS,
  EVENT_TYPE_LABELS,
  MESSAGE_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  RECIPIENT_LABELS,
  STATUS_LABELS,
} from '../../lib/status'
import { availableAdminActions, reminderApplies, showsPayment } from '../../lib/transitions'
import { useSendMessage } from '../outbox/useSendMessage'
import { CancelSheet, PaymentSheet, RescheduleSheet, StatusSheet } from './AppointmentSheets'

type SheetName = 'reschedule' | 'cancel' | 'cancel_new' | 'status' | 'payment' | null

function describeEvent(e: AppointmentEventRow): string {
  const data = (e.data ?? {}) as Record<string, unknown>
  switch (e.type) {
    case 'created':
      return 'تم تعيين الموعد'
    case 'status_changed':
      return `الحالة: ${e.from_status ? STATUS_LABELS[e.from_status as keyof typeof STATUS_LABELS] : '—'} ← ${
        e.to_status ? STATUS_LABELS[e.to_status as keyof typeof STATUS_LABELS] : '—'
      }${data.client_note ? ` · ملاحظة: ${String(data.client_note)}` : ''}`
    case 'rescheduled':
      return `الوقت: ${data.from_starts_at ? formatDateTime(String(data.from_starts_at)) : '—'} ← ${
        data.to_starts_at ? formatDateTime(String(data.to_starts_at)) : '—'
      }`
    case 'cancelled':
      return `تم الإلغاء${data.cancel_reason ? ` · السبب: ${String(data.cancel_reason)}` : ''}`
    case 'message_sent':
      return `انبعتت رسالة ${MESSAGE_KIND_LABELS[data.kind as keyof typeof MESSAGE_KIND_LABELS] ?? ''} لـ${
        RECIPIENT_LABELS[data.recipient as keyof typeof RECIPIENT_LABELS] ?? ''
      }`
    case 'payment_changed':
      return `الدفع: ${PAYMENT_STATUS_LABELS[data.from_payment_status as keyof typeof PAYMENT_STATUS_LABELS] ?? '—'} ← ${
        PAYMENT_STATUS_LABELS[data.to_payment_status as keyof typeof PAYMENT_STATUS_LABELS] ?? '—'
      }${data.payment_method ? ` (${PAYMENT_METHOD_LABELS[data.payment_method as keyof typeof PAYMENT_METHOD_LABELS]})` : ''}${
        data.to_price != null && data.to_price !== data.from_price ? ` · السعر: ${formatMoney(Number(data.to_price))}` : ''
      }`
    default:
      return EVENT_TYPE_LABELS[e.type] ?? e.type
  }
}

export function AppointmentDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const now = useNow()
  const toast = useToast()
  const appointment = useAppointment(id)
  const messages = useAppointmentMessages(id)
  const events = useAppointmentEvents(id)
  const settings = useSettings()
  const update = useUpdateAppointment()
  const sendMessage = useSendMessage()
  const [sheet, setSheet] = useState<SheetName>(null)
  const [notesDraft, setNotesDraft] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const a = appointment.data
  const justCreated = params.get('created') === '1'

  const unsent = useMemo(() => {
    const list = (messages.data ?? []).filter((m) => !m.sent_at && !m.skipped_at)
    if (!a) return list
    return list.filter((m) => (m.kind === 'reminder_day' || m.kind === 'reminder_hour' ? reminderApplies(a.status) : true))
  }, [messages.data, a])

  const dueNow = (m: OutboxMessageRow) => new Date(m.due_at).getTime() <= now.getTime()
  const nextClient = unsent.filter((m) => m.recipient === 'client').sort((x, y) => x.due_at.localeCompare(y.due_at))[0]
  const nextCompanion = unsent.filter((m) => m.recipient === 'companion').sort((x, y) => x.due_at.localeCompare(y.due_at))[0]
  const pendingCancel = unsent.some((m) => m.kind === 'cancel')

  if (appointment.isPending || settings.isPending) return <Spinner />
  if (appointment.isError || !a) return <ErrorNotice message={appointment.error ? (appointment.error as Error).message : 'الموعد مش موجود'} />
  if (settings.isError || !settings.data) return <ErrorNotice message={(settings.error as Error)?.message ?? 'ما قدرنا نقرأ الإعدادات'} />

  const actions = availableAdminActions(a, now)

  async function copyLink() {
    if (!a?.meeting_url) return
    try {
      await navigator.clipboard.writeText(a.meeting_url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ message: 'ما قدرنا ننسخ الرابط. انسخه يدوياً.', variant: 'error' })
    }
  }

  function setStatus(status: 'attended' | 'no_show') {
    update.mutate(
      { id: a!.id, patch: { status } },
      {
        onSuccess: () => toast({ message: status === 'attended' ? 'علّمناها "حضر".' : 'علّمناها "ما حضر".', variant: 'success' }),
        onError: (err) => toast({ message: toArabicError(err), variant: 'error' }),
      },
    )
  }

  function saveNotes() {
    if (notesDraft === null) return
    update.mutate(
      { id: a!.id, patch: { admin_notes: notesDraft.trim() || null } },
      {
        onSuccess: () => {
          setNotesDraft(null)
          toast({ message: 'انحفظت الملاحظات.', variant: 'success' })
        },
        onError: (err) => toast({ message: toArabicError(err), variant: 'error' }),
      },
    )
  }

  const firstName = a.clients.full_name.split(' ')[0]

  return (
    <div className="space-y-4">
      <Link to="/calendar" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary">
        <ChevronRightIcon width="18" height="18" />
        التقويم
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{a.clients.full_name}</h1>
          <p className="text-muted">
            {relativeDayLabel(a.starts_at, now)} · {formatDayAndDate(a.starts_at)} · <span dir="ltr">{formatTime(a.starts_at)}</span>
          </p>
        </div>
        <StatusBadge status={a.status} />
      </div>

      {justCreated && nextClient && (
        <Card className="space-y-3 border-primary/30 bg-primary-soft/40">
          <p className="font-semibold">انحفظ الموعد. هلأ ابعت الدعوة للزبون:</p>
          <Button className="w-full" onClick={() => void sendMessage.send(nextClient)}>
            <SendIcon width="18" height="18" />
            ابعت للزبون
          </Button>
        </Card>
      )}

      {pendingCancel && (
        <SoftNotice>
          <span className="font-semibold">رسالة الإلغاء لسا ما انبعتت.</span> الزبون لسا ما بيعرف إنو الجلسة انلغت.
        </SoftNotice>
      )}

      {a.status === 'change_requested' && (
        <SoftNotice>
          <span className="font-semibold">الزبون طلب تغيير الموعد.</span>
          {a.client_note ? (
            <>
              {' '}
              كتب: <q>{a.client_note}</q>
            </>
          ) : (
            ' ما كتب ملاحظة.'
          )}
        </SoftNotice>
      )}

      {a.status === 'cancelled' && (
        <SoftNotice>
          الموعد ملغي{a.cancel_reason ? ` · السبب: ${a.cancel_reason}` : ''}.
          <div className="mt-2">
            <Button variant="secondary" onClick={() => navigate(`/appointments/new?prefill=${a.id}`)}>
              عيّن موعد جديد لنفس الزبون
            </Button>
          </div>
        </SoftNotice>
      )}

      <Card className="divide-y divide-border py-1">
        <InfoRow label="الوقت والمدة" icon={<ClockIcon />}>
          {formatDateTime(a.starts_at)} · {durationLabel(a.duration_min)}
          {a.previous_starts_at && <span className="block text-sm text-muted">الموعد القديم: {formatDateTime(a.previous_starts_at)}</span>}
        </InfoRow>
        <InfoRow label="رقم الزبون" icon={<PhoneIcon />}>
          <a href={`https://wa.me/${a.clients.phone}`} target="_blank" rel="noopener" className="font-semibold text-primary" dir="ltr">
            {formatPhoneForDisplay(a.clients.phone)}
          </a>
          <Link to={`/clients/${a.client_id}`} className="ms-3 text-sm text-primary underline-offset-4 hover:underline">
            صفحة الزبون
          </Link>
        </InfoRow>
        {a.has_companion && (
          <InfoRow label="المرافق" icon={<UserIcon />}>
            {a.companion_name}
            {a.companion_phone && (
              <a href={`https://wa.me/${a.companion_phone}`} target="_blank" rel="noopener" className="ms-2 text-sm text-primary" dir="ltr">
                {formatPhoneForDisplay(a.companion_phone)}
              </a>
            )}
          </InfoRow>
        )}
        <InfoRow label="رابط الجلسة (زوم)" icon={<VideoIcon />}>
          {a.meeting_url && a.status !== 'cancelled' ? (
            <div className="flex flex-wrap items-center gap-2">
              <a href={a.meeting_url} target="_blank" rel="noopener" className="inline-flex min-h-9 items-center gap-1 font-semibold text-primary">
                دخول للجلسة
                <ExternalLinkIcon width="16" height="16" />
              </a>
              <button type="button" onClick={() => void copyLink()} className="inline-flex min-h-9 items-center gap-1 rounded-button bg-primary-soft px-3 text-sm font-semibold text-primary">
                {copied ? <CheckIcon width="16" height="16" /> : <CopyIcon width="16" height="16" />}
                {copied ? 'انتسخ' : 'نسخ'}
              </button>
            </div>
          ) : (
            <span className="text-muted">{a.status === 'cancelled' ? 'انحذف مع الإلغاء' : 'ما في رابط'}</span>
          )}
        </InfoRow>
        {a.responded_at && (
          <InfoRow label="آخر رد من الزبون">
            {timeAgoLabel(a.responded_at, now)} ({formatDateTime(a.responded_at)})
          </InfoRow>
        )}
      </Card>

      {a.status !== 'cancelled' || pendingCancel ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <MessageIcon />
              الرسائل
            </h2>
            <Link to="/messages" className="text-sm text-primary underline-offset-4 hover:underline">
              كل الرسائل
            </Link>
          </div>
          {(nextClient || nextCompanion) && (
            <div className="flex flex-wrap gap-2">
              {nextClient && (
                <Button onClick={() => void sendMessage.send(nextClient)} disabled={sendMessage.busy}>
                  <SendIcon width="18" height="18" />
                  ابعت للزبون
                </Button>
              )}
              {nextCompanion && (
                <Button variant="secondary" onClick={() => void sendMessage.send(nextCompanion)} disabled={sendMessage.busy}>
                  <SendIcon width="18" height="18" />
                  ابعت للمرافق
                </Button>
              )}
            </div>
          )}
          {messages.isPending ? (
            <Spinner />
          ) : unsent.length === 0 ? (
            <p className="text-sm text-muted">كل الرسائل انبعتت.</p>
          ) : (
            <ul className="divide-y divide-border">
              {unsent.map((m) => (
                <li key={m.id} className="space-y-2 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm">
                      <span className="font-semibold">{MESSAGE_KIND_LABELS[m.kind]}</span> لـ{RECIPIENT_LABELS[m.recipient]}
                      <span className="ms-2 text-muted">{dueNow(m) ? 'وقتها هلأ' : `وقتها: ${formatDateTime(m.due_at)}`}</span>
                    </p>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => void sendMessage.send(m)} className="inline-flex min-h-9 items-center gap-1 rounded-button bg-primary px-3 text-sm font-semibold text-white">
                        <SendIcon width="14" height="14" />
                        ابعت
                      </button>
                      <button type="button" onClick={() => void sendMessage.markSent(m.id)} className="inline-flex min-h-9 items-center gap-1 rounded-button bg-primary-soft px-3 text-sm font-semibold text-primary">
                        <CheckIcon width="14" height="14" />
                        انبعتت
                      </button>
                      <button type="button" onClick={() => void sendMessage.skip(m.id)} aria-label="تخطّي" className="inline-flex min-h-9 items-center rounded-button px-2 text-sm text-muted hover:bg-page-tint">
                        <SkipIcon width="16" height="16" />
                      </button>
                    </div>
                  </div>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-primary">اعرض النص</summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded-button bg-page-tint p-3 font-sans text-ink">{m.body}</pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      <Card className="space-y-3">
        <h2 className="font-semibold">إجراءات</h2>
        <div className="grid grid-cols-2 gap-2">
          {actions.includes('mark_attended') && (
            <Button onClick={() => setStatus('attended')} disabled={update.isPending || a.status === 'attended'}>
              حضر
            </Button>
          )}
          {actions.includes('mark_no_show') && (
            <Button variant="secondary" onClick={() => setStatus('no_show')} disabled={update.isPending || a.status === 'no_show'}>
              ما حضر
            </Button>
          )}
          {actions.includes('reschedule') && (
            <Button variant="secondary" onClick={() => setSheet('reschedule')}>
              غيّر الموعد
            </Button>
          )}
          {actions.includes('cancel') && (
            <Button variant="secondary" className="text-coral-text" onClick={() => setSheet('cancel')}>
              ألغي
            </Button>
          )}
          {actions.includes('cancel_and_new') && (
            <Button variant="ghost" onClick={() => setSheet('cancel_new')}>
              ألغي وعيّن جديد
            </Button>
          )}
          <Button variant="ghost" onClick={() => setSheet('status')}>
            غيّر الحالة
          </Button>
        </div>
      </Card>

      {showsPayment(a) && (
        <Card className="space-y-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <CoinsIcon />
            الدفع
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span>
              السعر: <span className="font-semibold">{formatMoney(a.price)}</span>
            </span>
            <span>
              الحالة:{' '}
              <span className={`font-semibold ${a.payment_status === 'unpaid' && (a.price ?? 0) > 0 ? 'text-coral-text' : 'text-status-confirmed-fg'}`}>
                {PAYMENT_STATUS_LABELS[a.payment_status]}
              </span>
            </span>
            {a.payment_method && <span>الطريقة: {PAYMENT_METHOD_LABELS[a.payment_method]}</span>}
            {a.paid_at && <span className="text-muted">({formatDateTime(a.paid_at)})</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setSheet('payment')}>{a.payment_status === 'paid' ? 'تعديل الدفع' : 'دفع'}</Button>
            {a.payment_status !== 'waived' && (
              <Button variant="secondary" disabled={update.isPending} onClick={() => update.mutate({ id: a.id, patch: { payment_status: 'waived' } })}>
                بدون دفع
              </Button>
            )}
            {a.payment_status !== 'unpaid' && (
              <Button variant="ghost" disabled={update.isPending} onClick={() => update.mutate({ id: a.id, patch: { payment_status: 'unpaid' } })}>
                رجّعها لغير مدفوعة
              </Button>
            )}
          </div>
        </Card>
      )}

      <Card className="space-y-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <NoteIcon />
          ملاحظات
        </h2>
        <Textarea value={notesDraft ?? a.admin_notes ?? ''} onChange={(e) => setNotesDraft(e.target.value)} placeholder="ملاحظات تنظيمية بس، مش علاجية" />
        {notesDraft !== null && notesDraft !== (a.admin_notes ?? '') && (
          <div className="flex gap-2">
            <Button onClick={saveNotes} disabled={update.isPending}>
              احفظ الملاحظات
            </Button>
            <Button variant="ghost" onClick={() => setNotesDraft(null)}>
              تراجع
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">سجل التغييرات</h2>
        {events.isPending ? (
          <Spinner />
        ) : (events.data?.length ?? 0) === 0 ? (
          <EmptyState text="ما في تغييرات بعد" />
        ) : (
          <ol className="divide-y divide-border">
            {events.data!.map((e) => (
              <li key={e.id} className="py-2.5 text-sm">
                <p>{describeEvent(e)}</p>
                <p className="text-xs text-muted">
                  {ACTOR_LABELS[e.actor] ?? e.actor} · {formatDateTime(e.created_at)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <p className="pb-2 text-center text-xs text-muted">
        رابط الرد الخاص بـ{firstName} بينبعت جوا الرسائل. ما تشاركه مع حدا ثاني.
      </p>

      {sheet === 'reschedule' && <RescheduleSheet appointment={a} settings={settings.data} open onClose={() => setSheet(null)} />}
      {(sheet === 'cancel' || sheet === 'cancel_new') && (
        <CancelSheet
          appointment={a}
          settings={settings.data}
          open
          andNew={sheet === 'cancel_new'}
          onClose={() => setSheet(null)}
          onCancelled={(andNew) => {
            if (andNew) navigate(`/appointments/new?prefill=${a.id}`)
          }}
        />
      )}
      {sheet === 'status' && <StatusSheet appointment={a} open onClose={() => setSheet(null)} />}
      {sheet === 'payment' && <PaymentSheet appointment={a} open onClose={() => setSheet(null)} />}
    </div>
  )
}
