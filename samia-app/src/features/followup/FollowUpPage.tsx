import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { PageTitle } from '../../components/Controls'
import { EmptyState, ErrorNotice, Spinner, useToast } from '../../components/Feedback'
import { StatusBadge } from '../../components/StatusBadge'
import { useFollowUpSource, useSettings, useUpdateAppointment } from '../../hooks/queries'
import { useNow } from '../../hooks/useNow'
import { formatDateTime, timeAgoLabel } from '../../lib/dates'
import { toArabicError } from '../../lib/errors'
import { buildFollowUpItems, FOLLOW_UP_LABELS, type FollowUpItem, type FollowUpKind } from '../../lib/followup'

const ORDER: FollowUpKind[] = ['change_requested', 'no_response', 'declined', 'unmarked']

const HINTS: Record<FollowUpKind, string> = {
  change_requested: 'تواصلي معه واتفقوا على وقت، بعدين غيّري الموعد من صفحته.',
  no_response: 'انبعتت الدعوة وما رد. يمكن ما شافها.',
  declined: 'رفض الموعد. يمكن بده موعد ثاني.',
  unmarked: 'الجلسة مرقت. علّميها حضر أو ما حضر عشان الدفع.',
}

export function FollowUpPage() {
  const now = useNow()
  const navigate = useNavigate()
  const toast = useToast()
  const settings = useSettings()
  const source = useFollowUpSource(now)
  const update = useUpdateAppointment()

  const items = useMemo(
    () => (source.data && settings.data ? buildFollowUpItems(source.data, settings.data, now) : []),
    [source.data, settings.data, now],
  )

  if (source.isPending || settings.isPending) return <Spinner />
  if (source.isError) return <ErrorNotice message={(source.error as Error).message} onRetry={() => void source.refetch()} />

  function mark(item: FollowUpItem, status: 'attended' | 'no_show') {
    update.mutate(
      { id: item.appointment.id, patch: { status } },
      {
        onSuccess: () => toast({ message: status === 'attended' ? 'علّمناها "حضر".' : 'علّمناها "ما حضر".', variant: 'success' }),
        onError: (err) => toast({ message: toArabicError(err), variant: 'error' }),
      },
    )
  }

  return (
    <div className="space-y-5">
      <PageTitle title="بدها متابعة" subtitle={items.length ? `${items.length} عنصر` : undefined} />
      {items.length === 0 && <EmptyState text="ما في إشي بده متابعة" hint="كل الزبائن ردّوا وكل الجلسات معلّمة" />}
      {ORDER.map((kind) => {
        const group = items.filter((i) => i.kind === kind)
        if (group.length === 0) return null
        return (
          <section key={kind} className="space-y-2">
            <h2 className="font-semibold">
              {FOLLOW_UP_LABELS[kind]} <span className="text-sm font-normal text-muted">({group.length})</span>
            </h2>
            <p className="text-sm text-muted">{HINTS[kind]}</p>
            <ul className="space-y-2">
              {group.map((item) => {
                const a = item.appointment
                return (
                  <li key={a.id} className="space-y-2 rounded-card border border-border bg-surface p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/appointments/${a.id}`} className="font-semibold text-primary underline-offset-4 hover:underline">
                          {a.clients.full_name}
                        </Link>
                        <p className="text-sm text-muted">{formatDateTime(a.starts_at)}</p>
                        {kind === 'no_response' && item.inviteSentAt && (
                          <p className="text-xs text-muted">الدعوة انبعتت {timeAgoLabel(item.inviteSentAt, now)}</p>
                        )}
                        {a.client_note && <p className="mt-1 text-sm">{kind === 'change_requested' ? 'كتب: ' : ''}<q>{a.client_note}</q></p>}
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {kind === 'unmarked' ? (
                        <>
                          <Button onClick={() => mark(item, 'attended')} disabled={update.isPending}>
                            حضر
                          </Button>
                          <Button variant="secondary" onClick={() => mark(item, 'no_show')} disabled={update.isPending}>
                            ما حضر
                          </Button>
                        </>
                      ) : kind === 'declined' ? (
                        <Button onClick={() => navigate(`/appointments/new?client=${a.client_id}`)}>عيّن موعد جديد</Button>
                      ) : (
                        <a
                          href={`https://wa.me/${a.clients.phone}`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 font-semibold text-white"
                        >
                          راسله على واتساب
                        </a>
                      )}
                      <Button variant="ghost" onClick={() => navigate(`/appointments/${a.id}`)}>
                        افتح الموعد
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
