import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { PageTitle } from '../../components/Controls'
import { ErrorNotice, SoftNotice, Spinner, useToast } from '../../components/Feedback'
import { BellIcon, DownloadIcon, KeyIcon, LogoutIcon, RefreshIcon, VideoIcon } from '../../components/Icons'
import { Field, Input, Toggle } from '../../components/Input'
import { useSettings, useUpdateSettings } from '../../hooks/queries'
import {
  deletePushSubscription,
  fetchAllAppointmentsForExport,
  fetchClients,
  invokeZoom,
  savePushSubscription,
} from '../../lib/api'
import { downloadTextFile, toCsv } from '../../lib/csv'
import type { SettingsRow } from '../../lib/database.types'
import { dayKey, formatDate, formatTime } from '../../lib/dates'
import { env } from '../../lib/env'
import { toArabicError } from '../../lib/errors'
import { formatPhoneForDisplay } from '../../lib/phone'
import { checkPushSupport, getCurrentPushSubscription, subscribeToPush, subscriptionToRow, unsubscribeFromPush } from '../../lib/push'
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, STATUS_LABELS } from '../../lib/status'
import { requireSupabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { TemplateEditor } from './TemplateEditor'

function Section({ title, icon, children, description }: { title: string; icon?: ReactNode; description?: string; children: ReactNode }) {
  return (
    <Card className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          {icon}
          {title}
        </h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </Card>
  )
}

function useSaveSettings() {
  const update = useUpdateSettings()
  const toast = useToast()
  return {
    save: (patch: Partial<SettingsRow>, message = 'انحفظ.') =>
      update.mutate(patch, {
        onSuccess: () => toast({ message, variant: 'success' }),
        onError: (err) => toast({ message: toArabicError(err), variant: 'error' }),
      }),
    busy: update.isPending,
  }
}

function TimingSection({ s }: { s: SettingsRow }) {
  const { save, busy } = useSaveSettings()
  const [dayHours, setDayHours] = useState(String(s.reminder_day_hours))
  const [hourMinutes, setHourMinutes] = useState(String(s.reminder_hour_minutes))
  const [followUp, setFollowUp] = useState(String(s.follow_up_after_hours))
  const [duration, setDuration] = useState(String(s.default_duration_min))

  function submit(e: FormEvent) {
    e.preventDefault()
    save({
      reminder_day_hours: Number(dayHours),
      reminder_hour_minutes: Number(hourMinutes),
      follow_up_after_hours: Number(followUp),
      default_duration_min: Number(duration),
    })
  }

  return (
    <Section title="التذكيرات والمتابعة والمدة" description="التغيير بينطبق على المواعيد الجديدة. التذكيرات الموجودة بتضل على وقتها.">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="تذكير قبل الموعد بـ (ساعات)" htmlFor="st-day">
          <Input id="st-day" type="number" min={1} max={168} dir="ltr" value={dayHours} onChange={(e) => setDayHours(e.target.value)} />
        </Field>
        <Field label="تذكير قبل الموعد بـ (دقايق)" htmlFor="st-hour">
          <Input id="st-hour" type="number" min={5} max={1440} dir="ltr" value={hourMinutes} onChange={(e) => setHourMinutes(e.target.value)} />
        </Field>
        <Field label="بدها متابعة إذا ما رد خلال (ساعات)" htmlFor="st-follow">
          <Input id="st-follow" type="number" min={1} max={336} dir="ltr" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
        </Field>
        <Field label="مدة الجلسة الافتراضية (دقايق)" htmlFor="st-duration">
          <Input id="st-duration" type="number" min={5} max={480} step={5} dir="ltr" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy}>
            احفظ
          </Button>
        </div>
      </form>
    </Section>
  )
}

function PriceSection({ s }: { s: SettingsRow }) {
  const { save, busy } = useSaveSettings()
  const [price, setPrice] = useState(s.default_price == null ? '' : String(s.default_price))
  return (
    <Section title="السعر العام للجلسة" description="بينستعمل لما ما يكون للزبون سعر خاص. بتقدري تعدّلي السعر لكل جلسة لحالها.">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save({ default_price: price.trim() === '' ? null : Number(price) })
        }}
        className="flex items-end gap-2"
      >
        <Field label="السعر (₪)" htmlFor="st-price" className="flex-1">
          <Input id="st-price" type="number" inputMode="decimal" min={0} dir="ltr" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Button type="submit" disabled={busy}>
          احفظ
        </Button>
      </form>
    </Section>
  )
}

function ZoomSection({ s }: { s: SettingsRow }) {
  const { save, busy } = useSaveSettings()
  const toast = useToast()
  const [fixedUrl, setFixedUrl] = useState(s.fixed_meeting_url ?? '')
  const status = useQuery({ queryKey: ['zoom-status'], queryFn: () => invokeZoom('status'), staleTime: 60_000, retry: false })
  const test = useMutation({
    mutationFn: () => invokeZoom('test'),
    onSuccess: (r) => toast({ message: r.ok ? 'الزوم مربوط وشغال.' : (r.message ?? 'ما زبط.'), variant: r.ok ? 'success' : 'error', durationMs: 6000 }),
  })

  return (
    <Section title="ربط الزوم" icon={<VideoIcon />}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${status.data?.configured ? 'bg-status-confirmed text-status-confirmed-fg' : 'bg-coral-soft text-coral-text'}`}>
          {status.isPending ? 'بنفحص...' : status.data?.configured ? 'مربوط' : 'مش مربوط'}
        </span>
        <Button variant="secondary" onClick={() => test.mutate()} disabled={test.isPending}>
          <RefreshIcon width="18" height="18" />
          {test.isPending ? 'بنجرّب...' : 'جرّب'}
        </Button>
      </div>
      {status.data && !status.data.configured && (
        <SoftNotice>
          {status.data.message ?? 'خدمة الزوم مش منشورة أو مفاتيحها ناقصة.'} الشرح خطوة خطوة بملف <span dir="ltr">docs/ZOOM_SETUP.md</span>.
        </SoftNotice>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save({ fixed_meeting_url: fixedUrl.trim() || null })
        }}
        className="space-y-2"
      >
        <Field label="رابط زوم ثابت (احتياط)" htmlFor="st-zoom-fixed" hint="بينستعمل إذا الزوم مش مربوط أو صار خطأ. مثلاً رابط غرفتك الشخصية.">
          <Input id="st-zoom-fixed" type="url" dir="ltr" placeholder="https://zoom.us/j/..." value={fixedUrl} onChange={(e) => setFixedUrl(e.target.value)} />
        </Field>
        <Button type="submit" disabled={busy}>
          احفظ الرابط
        </Button>
      </form>
      <SoftNotice tone="primary">
        <span className="font-semibold">ملاحظة الـ40 دقيقة:</span> بالحساب المجاني للزوم، اللقاء اللي فيه مضيف ومشارك بينتهي بعد 40 دقيقة. بتقدري تفتحيه من جديد بنفس
        الرابط وتكمّلوا.
      </SoftNotice>
    </Section>
  )
}

function PushSection() {
  const toast = useToast()
  const support = checkPushSupport()
  const [subscribed, setSubscribed] = useState<boolean | null>(null)

  useEffect(() => {
    getCurrentPushSubscription()
      .then((sub) => setSubscribed(!!sub))
      .catch(() => setSubscribed(false))
  }, [])

  const enable = useMutation({
    mutationFn: async () => {
      const sub = await subscribeToPush(env.vapidPublicKey)
      await savePushSubscription(subscriptionToRow(sub))
    },
    onSuccess: () => {
      setSubscribed(true)
      toast({ message: 'تفعّلت التنبيهات على هاد الجهاز.', variant: 'success' })
    },
    onError: (err) => toast({ message: toArabicError(err), variant: 'error', durationMs: 7000 }),
  })

  const disable = useMutation({
    mutationFn: async () => {
      const endpoint = await unsubscribeFromPush()
      if (endpoint) await deletePushSubscription(endpoint)
    },
    onSuccess: () => {
      setSubscribed(false)
      toast({ message: 'انطفت التنبيهات على هاد الجهاز.' })
    },
    onError: (err) => toast({ message: toArabicError(err), variant: 'error' }),
  })

  const testPush = useMutation({
    mutationFn: async () => {
      const { data, error } = await requireSupabase().functions.invoke<{ ok: boolean; message?: string; sent?: number }>('notify-due', {
        body: { action: 'test' },
      })
      if (error) throw error
      return data
    },
    onSuccess: (data) =>
      toast({
        message: data?.ok ? `انبعت تنبيه تجريبي لـ${data.sent ?? 0} جهاز.` : (data?.message ?? 'ما زبط.'),
        variant: data?.ok ? 'success' : 'error',
      }),
    onError: (err) => toast({ message: toArabicError(err, 'خدمة التنبيهات مش منشورة بعد.'), variant: 'error' }),
  })

  return (
    <Section title="التنبيهات على التلفون" icon={<BellIcon />} description="تنبيه لما يجي وقت رسالة لازم تنبعت، وملخص الصبح.">
      {!support.supported ? (
        <SoftNotice>{support.reason}</SoftNotice>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${subscribed ? 'bg-status-confirmed text-status-confirmed-fg' : 'bg-page-tint text-muted'}`}>
            {subscribed === null ? 'بنفحص...' : subscribed ? 'مفعّلة على هاد الجهاز' : 'مش مفعّلة على هاد الجهاز'}
          </span>
          {subscribed ? (
            <>
              <Button variant="secondary" onClick={() => testPush.mutate()} disabled={testPush.isPending}>
                ابعتي تنبيه تجريبي
              </Button>
              <Button variant="ghost" onClick={() => disable.mutate()} disabled={disable.isPending}>
                طفّي التنبيهات
              </Button>
            </>
          ) : (
            <Button onClick={() => enable.mutate()} disabled={enable.isPending || subscribed === null}>
              {enable.isPending ? 'لحظة...' : 'فعّلي التنبيهات'}
            </Button>
          )}
        </div>
      )}
      {!env.vapidPublicKey && <SoftNotice>مفتاح التنبيهات لسا مش مضبوط (VITE_VAPID_PUBLIC_KEY). الشرح بملف <span dir="ltr">docs/NOTIFICATIONS_SETUP.md</span>.</SoftNotice>}
      <details className="rounded-card bg-page-tint p-3.5 text-sm">
        <summary className="cursor-pointer font-semibold">كيف أفعّل التنبيهات على التلفون؟</summary>
        <div className="mt-2 space-y-2 leading-relaxed">
          <p>
            <span className="font-semibold">آيفون (iOS 16.4 وأحدث):</span> افتحي الرابط بـ Safari ← زر المشاركة (المربع مع السهم) ← "إضافة إلى الشاشة الرئيسية" ← افتحي
            التطبيق من الشاشة الرئيسية ← ارجعي لهاي الصفحة واكبسي "فعّلي التنبيهات".
          </p>
          <p>
            <span className="font-semibold">أندرويد:</span> افتحي الرابط بـ Chrome ← اكبسي "فعّلي التنبيهات" واسمحي. وللأفضل: من قائمة Chrome ← "تثبيت التطبيق".
          </p>
          <p>لازم تفعّلي التنبيهات على كل جهاز بدك توصلك عليه (مثلاً التلفون والكمبيوتر).</p>
        </div>
      </details>
    </Section>
  )
}

function SummarySection({ s }: { s: SettingsRow }) {
  const { save, busy } = useSaveSettings()
  const [enabled, setEnabled] = useState(s.daily_summary_enabled)
  const [time, setTime] = useState(s.daily_summary_time.slice(0, 5))
  return (
    <Section title="ملخص الصبح" description='تنبيه يومي: "صباح الخير، اليوم عندك 3 جلسات، ورسالتين لازم ينبعتوا."'>
      <Toggle checked={enabled} onChange={setEnabled} label="تشغيل ملخص الصبح" />
      <div className="flex items-end gap-2">
        <Field label="الساعة (بتوقيت القدس)" htmlFor="st-summary-time" className="flex-1">
          <Input id="st-summary-time" type="time" dir="ltr" value={time} onChange={(e) => setTime(e.target.value)} disabled={!enabled} />
        </Field>
        <Button onClick={() => save({ daily_summary_enabled: enabled, daily_summary_time: time || '08:00' })} disabled={busy}>
          احفظ
        </Button>
      </div>
    </Section>
  )
}

function LinkSection({ s }: { s: SettingsRow }) {
  const { save, busy } = useSaveSettings()
  const [url, setUrl] = useState(s.public_base_url ?? '')
  const current = window.location.origin
  return (
    <Section title="رابط التطبيق" description="بينبني منه رابط الرد اللي بيوصل للزبائن بالرسائل. لازم يكون الرابط الحقيقي بعد الرفع على الإنترنت.">
      <Field label="الرابط" htmlFor="st-base-url">
        <Input id="st-base-url" type="url" dir="ltr" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => save({ public_base_url: url.trim().replace(/\/+$/, '') || null })} disabled={busy}>
          احفظ
        </Button>
        <Button variant="secondary" onClick={() => setUrl(current)}>
          استعمل رابط هاي الصفحة ({current})
        </Button>
      </div>
      {(s.public_base_url ?? '').includes('localhost') && <SoftNotice>الرابط الحالي محلي (localhost). الزبائن ما رح يقدروا يفتحوه من تلفوناتهم. بعد الرفع على Cloudflare Pages غيّريه للرابط الحقيقي.</SoftNotice>}
    </Section>
  )
}

function ExportSection() {
  const toast = useToast()
  const exportMutation = useMutation({
    mutationFn: async (kind: 'clients' | 'appointments' | 'payments') => {
      const today = dayKey(new Date())
      if (kind === 'clients') {
        const rows = await fetchClients(true)
        downloadTextFile(
          `clients-${today}.csv`,
          toCsv(rows, [
            { key: 'full_name', label: 'الاسم' },
            { key: 'phone', label: 'رقم الواتساب', value: (r) => formatPhoneForDisplay(r.phone) },
            { key: 'default_companion_name', label: 'المرافق' },
            { key: 'default_companion_phone', label: 'رقم المرافق', value: (r) => formatPhoneForDisplay(r.default_companion_phone) },
            { key: 'default_price', label: 'السعر الافتراضي' },
            { key: 'notes', label: 'ملاحظات' },
            { key: 'archived', label: 'مؤرشف', value: (r) => (r.archived ? 'نعم' : 'لا') },
            { key: 'created_at', label: 'تاريخ الإضافة', value: (r) => formatDate(r.created_at) },
          ]),
        )
        return rows.length
      }
      const all = await fetchAllAppointmentsForExport()
      const rows = kind === 'payments' ? all.filter((a) => a.status === 'attended' || a.status === 'no_show') : all
      downloadTextFile(
        `${kind}-${today}.csv`,
        toCsv(rows, [
          { key: 'date', label: 'التاريخ', value: (r) => formatDate(r.starts_at) },
          { key: 'time', label: 'الساعة', value: (r) => formatTime(r.starts_at) },
          { key: 'duration_min', label: 'المدة (دقايق)' },
          { key: 'client', label: 'الزبون', value: (r) => r.clients.full_name },
          { key: 'phone', label: 'رقم الزبون', value: (r) => formatPhoneForDisplay(r.clients.phone) },
          { key: 'status', label: 'الحالة', value: (r) => STATUS_LABELS[r.status] },
          { key: 'companion_name', label: 'المرافق' },
          { key: 'price', label: 'السعر' },
          { key: 'payment_status', label: 'الدفع', value: (r) => PAYMENT_STATUS_LABELS[r.payment_status] },
          { key: 'payment_method', label: 'طريقة الدفع', value: (r) => (r.payment_method ? PAYMENT_METHOD_LABELS[r.payment_method] : '') },
          { key: 'paid_at', label: 'تاريخ الدفع', value: (r) => (r.paid_at ? formatDate(r.paid_at) : '') },
          { key: 'cancel_reason', label: 'سبب الإلغاء' },
          { key: 'client_note', label: 'ملاحظة الزبون' },
          { key: 'admin_notes', label: 'ملاحظات' },
        ]),
      )
      return rows.length
    },
    onSuccess: (n) => toast({ message: `نزّلنا ملف فيه ${n} سطر.`, variant: 'success' }),
    onError: (err) => toast({ message: toArabicError(err), variant: 'error' }),
  })
  return (
    <Section title="تصدير البيانات" icon={<DownloadIcon />} description="نسخة احتياطية بصيغة CSV (بتنفتح بـ Excel). الخطة المجانية لـ Supabase ما فيها نسخ احتياطية تلقائية، فنزّلي نسخة كل فترة.">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => exportMutation.mutate('clients')} disabled={exportMutation.isPending}>
          الزبائن
        </Button>
        <Button variant="secondary" onClick={() => exportMutation.mutate('appointments')} disabled={exportMutation.isPending}>
          المواعيد
        </Button>
        <Button variant="secondary" onClick={() => exportMutation.mutate('payments')} disabled={exportMutation.isPending}>
          الدفعات
        </Button>
      </div>
      <p className="text-xs text-muted">الملفات فيها معلومات الزبائن. احفظيها بمكان آمن.</p>
    </Section>
  )
}

function PasswordSection() {
  const { updatePassword } = useAuth()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const change = useMutation({
    mutationFn: () => updatePassword(password),
    onSuccess: () => {
      setPassword('')
      setConfirm('')
      toast({ message: 'تغيّرت كلمة السر.', variant: 'success' })
    },
    onError: (err) => setError(toArabicError(err)),
  })
  return (
    <Section title="تغيير كلمة السر" icon={<KeyIcon />}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          if (password.length < 8) return setError('كلمة السر لازم تكون 8 أحرف على الأقل.')
          if (password !== confirm) return setError('كلمتين السر مش متطابقتين.')
          change.mutate()
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <Field label="كلمة السر الجديدة" htmlFor="st-pass">
          <Input id="st-pass" type="password" autoComplete="new-password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="تأكيد كلمة السر" htmlFor="st-pass2">
          <Input id="st-pass2" type="password" autoComplete="new-password" dir="ltr" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        {error && (
          <div className="sm:col-span-2">
            <ErrorNotice message={error} />
          </div>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={change.isPending || !password}>
            غيّري كلمة السر
          </Button>
        </div>
      </form>
    </Section>
  )
}

function AccountSection() {
  const { user, signOut } = useAuth()
  return (
    <Section title="الحساب">
      <p className="text-sm text-muted">
        مسجّلة دخول بـ <span dir="ltr">{user?.email}</span>
      </p>
      <Button variant="secondary" onClick={() => void signOut()}>
        <LogoutIcon width="18" height="18" />
        تسجيل خروج
      </Button>
      <p className="text-xs text-muted">مواعيد سامية يحيى · النسخة 0.1.0 · الملاحظات بالتطبيق للأمور التنظيمية بس.</p>
    </Section>
  )
}

export function SettingsPage() {
  const settings = useSettings()
  if (settings.isPending) return <Spinner />
  if (settings.isError || !settings.data) return <ErrorNotice message={(settings.error as Error)?.message ?? 'ما قدرنا نقرأ الإعدادات'} onRetry={() => void settings.refetch()} />
  const s = settings.data
  return (
    <div className="space-y-4">
      <PageTitle title="الإعدادات" />
      <Section title="قوالب الرسائل" description="المتغيرات بين أقواس بتتعبى لحالها. اكبسي على متغير عشان يندخل مكان المؤشر.">
        <TemplateEditor settings={s} />
      </Section>
      <TimingSection key={`timing-${s.updated_at}`} s={s} />
      <PriceSection key={`price-${s.updated_at}`} s={s} />
      <ZoomSection key={`zoom-${s.updated_at}`} s={s} />
      <PushSection />
      <SummarySection key={`summary-${s.updated_at}`} s={s} />
      <LinkSection key={`link-${s.updated_at}`} s={s} />
      <ExportSection />
      <PasswordSection />
      <AccountSection />
    </div>
  )
}
