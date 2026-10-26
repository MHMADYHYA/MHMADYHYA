import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router'
import { ButterflyMark } from '../../components/ButterflyMark'
import { ExternalLinkIcon, LockIcon, MapPinIcon } from '../../components/Icons'
import { Textarea } from '../../components/Input'
import { getPublicAppointment, respondToAppointment, type PublicAppointment } from '../../lib/api'
import { ARABIC_MONTH_NAMES, durationLabel, formatDate, formatDayName, formatTime, toAppTime } from '../../lib/dates'
import { toArabicError } from '../../lib/errors'
import { mapsUrl } from '../../lib/place'
import { isSupabaseConfigured } from '../../lib/supabase'
import type { ClientAction } from '../../lib/transitions'

type Stage = 'view' | 'change_form' | 'thanks'

const BIG_BUTTON = 'flex min-h-14 w-full items-center justify-center rounded-button px-5 text-lg font-semibold transition-colors disabled:opacity-50'

function MiniCalendar({ startsAt }: { startsAt: string }) {
  const d = toAppTime(startsAt)
  return (
    <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-card border border-border bg-surface shadow-sm">
      <span className="text-xs font-semibold text-coral-text">{ARABIC_MONTH_NAMES[d.getMonth()]}</span>
      <span className="text-3xl font-semibold leading-none text-ink" dir="ltr">
        {d.getDate()}
      </span>
      <span className="text-xs text-muted">{formatDayName(startsAt)}</span>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8">
      <ButterflyMark size={56} />
      <div className="mt-6 w-full max-w-md flex-1">{children}</div>
      <p className="mt-8 flex items-center gap-1.5 text-xs text-muted">
        <LockIcon width="14" height="14" />
        هاد الرابط خاص فيك
      </p>
    </div>
  )
}

function Message({ title, text }: { title: string; text?: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-6 text-center">
      <p className="text-xl font-semibold">{title}</p>
      {text && <p className="mt-2 text-muted">{text}</p>}
    </div>
  )
}

export function PublicAppointmentPage() {
  const { token = '' } = useParams<{ token: string }>()
  const [stage, setStage] = useState<Stage>('view')
  const [note, setNote] = useState('')
  const [lastAction, setLastAction] = useState<ClientAction | null>(null)

  const query = useQuery({
    queryKey: ['public-appointment', token],
    queryFn: () => getPublicAppointment(token),
    enabled: isSupabaseConfigured() && token.length >= 20,
    retry: 1,
  })

  const respond = useMutation({
    mutationFn: ({ action, text }: { action: ClientAction; text: string | null }) => respondToAppointment(token, action, text),
    onSuccess: (result, vars) => {
      if (result.ok) {
        query.refetch()
        setLastAction(vars.action)
        setStage('thanks')
      }
    },
  })

  if (!isSupabaseConfigured() || token.length < 20) {
    return (
      <Shell>
        <Message title="الرابط مش صالح" />
      </Shell>
    )
  }
  if (query.isPending) {
    return (
      <Shell>
        <p className="text-center text-muted">لحظة...</p>
      </Shell>
    )
  }
  if (query.isError) {
    return (
      <Shell>
        <Message title="صار خطأ" text={toArabicError(query.error)} />
      </Shell>
    )
  }
  const info: PublicAppointment | null = query.data
  if (!info) {
    return (
      <Shell>
        <Message title="الرابط مش صالح" />
      </Shell>
    )
  }
  if (info.status === 'cancelled') {
    return (
      <Shell>
        <Message title="الجلسة ملغية" text={`مرحبا ${info.first_name}، هاي الجلسة انلغت. سامية رح تتواصل معك إذا في موعد جديد.`} />
      </Shell>
    )
  }
  if (!info.can_respond) {
    return (
      <Shell>
        <Message title="انتهى موعد الجلسة" text={`يوم ${formatDayName(info.starts_at)} ${formatDate(info.starts_at)} الساعة ${formatTime(info.starts_at)}`} />
      </Shell>
    )
  }

  const inPerson = info.session_type === 'in_person'

  const respondError =
    respond.data && !respond.data.ok
      ? respond.data.error === 'expired'
        ? 'انتهى موعد الجلسة.'
        : respond.data.error === 'cancelled'
          ? 'الجلسة انلغت.'
          : respond.data.error === 'slot_taken'
            ? 'هاد الوقت ما عاد متاح. سجّلنا إنك بدك موعد، وسامية رح تتواصل معك.'
            : 'ما قدرنا نسجّل ردك. جرّب مرة ثانية.'
      : respond.error
        ? toArabicError(respond.error)
        : null

  const appointmentCard = (
    <div className="flex items-center gap-4 rounded-card border border-border bg-surface p-4">
      <MiniCalendar startsAt={info.starts_at} />
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold">
          {formatDayName(info.starts_at)} {formatDate(info.starts_at)}
        </p>
        <p className="text-ink">
          الساعة <span dir="ltr">{formatTime(info.starts_at)}</span> · {durationLabel(info.duration_min)}
        </p>
        {inPerson ? (
          <p className="text-sm text-muted">
            جلسة وجاهية{info.location ? <>: <span className="text-ink">{info.location}</span></> : null}
          </p>
        ) : (
          <p className="text-sm text-muted">جلسة أونلاين بالزوم</p>
        )}
      </div>
    </div>
  )

  // للزوم: زر الدخول للجلسة. للوجاهي: زر الخريطة للعنوان
  const zoomButton = inPerson
    ? info.location && (
        <a href={mapsUrl(info.location)} target="_blank" rel="noopener" className={`${BIG_BUTTON} bg-primary-soft text-primary hover:bg-[#D6E5EA]`}>
          افتح العنوان بالخريطة
          <MapPinIcon className="ms-2" width="18" height="18" />
        </a>
      )
    : info.meeting_url && (
        <a href={info.meeting_url} target="_blank" rel="noopener" className={`${BIG_BUTTON} bg-primary-soft text-primary hover:bg-[#D6E5EA]`}>
          دخول للجلسة (زوم)
          <ExternalLinkIcon className="ms-2" width="18" height="18" />
        </a>
      )

  const changeLink = (
    <button
      type="button"
      onClick={() => {
        setStage('view')
        respond.reset()
      }}
      className="block w-full py-2 text-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
    >
      بدي أغيّر ردي
    </button>
  )

  if (stage === 'thanks' || (stage === 'view' && info.status !== 'pending' && !lastAction && !respond.isPending)) {
    const status = info.status
    if (status === 'confirmed') {
      return (
        <Shell>
          <div className="space-y-4 text-center">
            <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-primary-soft/70" aria-hidden="true" />
              <span className="absolute inset-5 rounded-full bg-coral-soft/80" aria-hidden="true" />
              <ButterflyMark size={88} className="animate-butterfly-rise relative" title="" />
            </div>
            <p className="text-2xl font-semibold">شكراً {info.first_name}</p>
            <span className="inline-flex rounded-full bg-status-confirmed px-4 py-1.5 font-semibold text-status-confirmed-fg">تم تأكيد الموعد</span>
            {appointmentCard}
            {zoomButton}
            {changeLink}
          </div>
        </Shell>
      )
    }
    return (
      <Shell>
        <div className="space-y-4 text-center">
          <ButterflyMark size={72} className="mx-auto" title="" />
          <p className="text-2xl font-semibold">شكراً {info.first_name}</p>
          <p className="text-muted">
            {status === 'change_requested' ? 'استلمنا طلبك لتغيير الموعد.' : 'استلمنا ردك.'} سامية رح تتواصل معك قريباً.
          </p>
          {appointmentCard}
          {changeLink}
        </div>
      </Shell>
    )
  }

  if (stage === 'change_form') {
    return (
      <Shell>
        <div className="space-y-4">
          <p className="text-xl font-semibold">شو الوقت اللي بناسبك؟</p>
          <p className="text-sm text-muted">اختياري. اكتب الأيام أو الساعات اللي بتناسبك وسامية بتتواصل معك.</p>
          <Textarea rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} aria-label="الوقت المناسب" />
          <p className="text-end text-xs text-muted" dir="ltr">
            {note.length}/500
          </p>
          {respondError && <p className="rounded-card bg-coral-soft p-3 text-sm text-coral-text">{respondError}</p>}
          <button
            type="button"
            disabled={respond.isPending}
            onClick={() => respond.mutate({ action: 'change', text: note.trim() || null })}
            className={`${BIG_BUTTON} bg-primary text-white hover:bg-[#1A4252]`}
          >
            {respond.isPending ? 'لحظة...' : 'ابعت'}
          </button>
          <button type="button" onClick={() => setStage('view')} className="block w-full py-2 text-center text-sm font-semibold text-muted">
            رجوع
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="space-y-4">
        <div>
          <p className="text-2xl font-semibold">مرحبا {info.first_name}</p>
          <p className="text-muted">سامية حدّدت إلك جلسة. بتناسبك؟</p>
        </div>
        {appointmentCard}
        {zoomButton}
        {respondError && <p className="rounded-card bg-coral-soft p-3 text-sm text-coral-text">{respondError}</p>}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            disabled={respond.isPending}
            onClick={() => respond.mutate({ action: 'confirm', text: null })}
            className={`${BIG_BUTTON} bg-primary text-white hover:bg-[#1A4252]`}
          >
            موافق
          </button>
          <button
            type="button"
            disabled={respond.isPending}
            onClick={() => setStage('change_form')}
            className={`${BIG_BUTTON} border border-border bg-surface text-ink hover:bg-page-tint`}
          >
            بدي أغيّر
          </button>
          <button
            type="button"
            disabled={respond.isPending}
            onClick={() => respond.mutate({ action: 'decline', text: null })}
            className={`${BIG_BUTTON} text-coral-text hover:bg-coral-soft`}
          >
            ما بقدر أجي
          </button>
        </div>
      </div>
    </Shell>
  )
}
