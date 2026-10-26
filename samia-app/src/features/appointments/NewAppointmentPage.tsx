import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { PageTitle } from '../../components/Controls'
import { ErrorNotice, SoftNotice, Spinner, useToast } from '../../components/Feedback'
import { ChevronRightIcon, SearchIcon, XIcon } from '../../components/Icons'
import { Field, Input, Select, Textarea, Toggle } from '../../components/Input'
import { useAppointment, useClients, useInvalidateAll, useSettings } from '../../hooks/queries'
import type { ClientRow, SessionType } from '../../lib/database.types'
import { combineDateAndTime, dayKey, formatTime, fromWallClock, roundUpToQuarter, splitWallClock } from '../../lib/dates'
import { toArabicError } from '../../lib/errors'
import { formatPhoneForDisplay } from '../../lib/phone'
import { createAppointmentFlow, type NewAppointmentInput } from './flows'
import { SessionPlaceFields } from './SessionPlaceFields'

/** خيارات الساعة بخطوات ربع ساعة من 07:00 لـ 21:45 */
export const TIME_OPTIONS: string[] = (() => {
  const out: string[] = []
  for (let h = 7; h < 22; h++) for (const m of [0, 15, 30, 45]) out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  return out
})()

export function NewAppointmentPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const invalidateAll = useInvalidateAll()
  const settings = useSettings()
  const clients = useClients(false)
  const prefillId = params.get('prefill') ?? undefined
  const prefill = useAppointment(prefillId)

  const initialStart = useMemo(() => {
    const fromParam = params.get('start')
    const parsed = fromParam ? fromWallClock(fromParam) : null
    return parsed ?? roundUpToQuarter(new Date(Date.now() + 60 * 60_000))
  }, [params])

  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing')
  const [clientId, setClientId] = useState<string>(params.get('client') ?? '')
  const [clientSearch, setClientSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [date, setDate] = useState(() => splitWallClock(initialStart).date)
  const [time, setTime] = useState(() => splitWallClock(initialStart).time)
  const [duration, setDuration] = useState<string>('')
  const [sessionType, setSessionType] = useState<SessionType>('zoom')
  const [location, setLocation] = useState('')
  const [hasCompanion, setHasCompanion] = useState(false)
  const [companionName, setCompanionName] = useState('')
  const [companionPhone, setCompanionPhone] = useState('')
  const [price, setPrice] = useState<string>('')
  const [priceTouched, setPriceTouched] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const selectedClient = useMemo(() => clients.data?.find((c) => c.id === clientId) ?? null, [clients.data, clientId])

  // الافتراضيات من الإعدادات
  useEffect(() => {
    if (settings.data && duration === '') setDuration(String(settings.data.default_duration_min))
  }, [settings.data, duration])

  // تعبئة من موعد سابق (ألغي وعيّن جديد)
  useEffect(() => {
    if (!prefill.data) return
    const a = prefill.data
    setClientId(a.client_id)
    setDuration(String(a.duration_min))
    setSessionType(a.session_type ?? 'zoom')
    setLocation(a.location ?? '')
    setHasCompanion(a.has_companion)
    setCompanionName(a.companion_name ?? '')
    setCompanionPhone(a.companion_phone ? formatPhoneForDisplay(a.companion_phone) : '')
    if (a.price != null) {
      setPrice(String(a.price))
      setPriceTouched(true)
    }
    setNotes(a.admin_notes ?? '')
  }, [prefill.data])

  // لما تختار زبون: المرافق الافتراضي والسعر
  useEffect(() => {
    if (!selectedClient || prefillId) return
    if (selectedClient.default_companion_name || selectedClient.default_companion_phone) {
      setHasCompanion(true)
      setCompanionName(selectedClient.default_companion_name ?? '')
      setCompanionPhone(selectedClient.default_companion_phone ? formatPhoneForDisplay(selectedClient.default_companion_phone) : '')
    }
    if (!priceTouched) {
      const p = selectedClient.default_price ?? settings.data?.default_price ?? null
      setPrice(p == null ? '' : String(p))
    }
  }, [selectedClient, settings.data, priceTouched, prefillId])

  useEffect(() => {
    if (!selectedClient && !priceTouched && settings.data?.default_price != null && price === '') {
      setPrice(String(settings.data.default_price))
    }
  }, [selectedClient, priceTouched, settings.data, price])

  const matches = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    const list = clients.data ?? []
    if (!q) return list.slice(0, 8)
    const digits = q.replace(/\D/g, '')
    return list.filter((c) => c.full_name.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.includes(digits))).slice(0, 8)
  }, [clients.data, clientSearch])

  const create = useMutation({
    mutationFn: (input: NewAppointmentInput) => createAppointmentFlow(input, settings.data!, clients.data ?? [], new Date()),
    onSuccess: (result) => {
      invalidateAll()
      if (result.warning) toast({ message: result.warning, variant: 'error', durationMs: 7000 })
      navigate(`/appointments/${result.id}?created=1`, { replace: true })
    },
    onError: (err) => setError(toArabicError(err)),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!settings.data) return
    const startsAt = combineDateAndTime(date, time)
    if (!startsAt) return setError('التاريخ أو الساعة مش صالحين')
    const durationMin = Number(duration)
    if (!Number.isInteger(durationMin) || durationMin < 5 || durationMin > 480) return setError('المدة لازم تكون بين 5 و480 دقيقة')
    const priceNum = price.trim() === '' ? null : Number(price)
    if (priceNum !== null && (Number.isNaN(priceNum) || priceNum < 0)) return setError('السعر لازم يكون رقم')
    if (clientMode === 'existing' && !clientId) return setError('اختار زبون أو أضف زبون جديد')

    create.mutate({
      client: clientMode === 'new' ? { mode: 'new', full_name: newName, phone: newPhone } : { mode: 'existing', id: clientId },
      starts_at: startsAt,
      duration_min: durationMin,
      session_type: sessionType,
      location,
      has_companion: hasCompanion,
      companion_name: companionName,
      companion_phone: companionPhone,
      price: priceNum,
      admin_notes: notes,
    })
  }

  if (settings.isPending || clients.isPending || (prefillId && prefill.isPending)) return <Spinner />
  if (settings.isError) return <ErrorNotice message={(settings.error as Error).message} />

  const todayKey = dayKey(new Date())

  return (
    <div className="space-y-4">
      <Link to="/calendar" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary">
        <ChevronRightIcon width="18" height="18" />
        التقويم
      </Link>
      <PageTitle title="موعد جديد" subtitle={prefillId ? 'بنفس الزبون والمرافق من الموعد الملغي' : undefined} />

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">الزبون</h2>
            <button
              type="button"
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
              onClick={() => {
                setClientMode(clientMode === 'existing' ? 'new' : 'existing')
                setError(null)
              }}
            >
              {clientMode === 'existing' ? 'زبون جديد' : 'اختيار زبون موجود'}
            </button>
          </div>

          {clientMode === 'new' ? (
            <>
              <Field label="الاسم الكامل" htmlFor="new-client-name">
                <Input id="new-client-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </Field>
              <Field label="رقم الواتساب" htmlFor="new-client-phone" hint="مثال: 0501234567">
                <Input id="new-client-phone" type="tel" inputMode="tel" dir="ltr" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              </Field>
            </>
          ) : selectedClient ? (
            <div className="flex items-center justify-between gap-3 rounded-button bg-primary-soft px-3.5 py-2.5">
              <div>
                <p className="font-semibold text-primary">{selectedClient.full_name}</p>
                <p className="text-sm text-muted" dir="ltr">
                  {formatPhoneForDisplay(selectedClient.phone)}
                </p>
              </div>
              <button
                type="button"
                aria-label="تغيير الزبون"
                onClick={() => {
                  setClientId('')
                  setPriceTouched(false)
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-primary hover:bg-surface"
              >
                <XIcon />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-muted" />
                <Input
                  aria-label="بحث عن زبون"
                  placeholder="اكتب اسم الزبون"
                  className="ps-10"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  autoFocus
                />
              </div>
              {(clients.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted">لسا ما في زبائن. اكبس "زبون جديد" فوق.</p>
              ) : (
                <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-button border border-border">
                  {matches.map((c: ClientRow) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setClientId(c.id)}
                        className="flex min-h-11 w-full items-center justify-between px-3.5 py-2 text-start hover:bg-page-tint"
                      >
                        <span className="font-semibold">{c.full_name}</span>
                        <span className="text-sm text-muted" dir="ltr">
                          {formatPhoneForDisplay(c.phone)}
                        </span>
                      </button>
                    </li>
                  ))}
                  {matches.length === 0 && <li className="px-3.5 py-3 text-sm text-muted">ما لقينا زبون بهاد الاسم</li>}
                </ul>
              )}
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">الوقت</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="التاريخ" htmlFor="appt-date">
              <Input id="appt-date" type="date" dir="ltr" value={date} min={todayKey} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="الساعة" htmlFor="appt-time">
              <Select id="appt-time" dir="ltr" value={time} onChange={(e) => setTime(e.target.value)}>
                {!TIME_OPTIONS.includes(time) && <option value={time}>{time}</option>}
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="المدة (دقايق)" htmlFor="appt-duration">
            <Input id="appt-duration" type="number" inputMode="numeric" min={5} max={480} step={5} dir="ltr" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </Field>
        </Card>

        <Card>
          <SessionPlaceFields
            idPrefix="appt"
            sessionType={sessionType}
            onSessionTypeChange={setSessionType}
            location={location}
            onLocationChange={setLocation}
            clinicAddress={settings.data.clinic_address}
          />
        </Card>

        <Card className="space-y-3">
          <Toggle checked={hasCompanion} onChange={setHasCompanion} label="مع مرافق" description="بتوصله نسخة من كل رسالة" />
          {hasCompanion && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="اسم المرافق" htmlFor="companion-name">
                <Input id="companion-name" value={companionName} onChange={(e) => setCompanionName(e.target.value)} />
              </Field>
              <Field label="رقم المرافق" htmlFor="companion-phone">
                <Input id="companion-phone" type="tel" inputMode="tel" dir="ltr" value={companionPhone} onChange={(e) => setCompanionPhone(e.target.value)} />
              </Field>
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <Field label="السعر (₪)" htmlFor="appt-price" hint="بيتعبى من سعر الزبون أو السعر العام، وبتقدر تعدّله">
            <Input
              id="appt-price"
              type="number"
              inputMode="decimal"
              min={0}
              step={1}
              dir="ltr"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value)
                setPriceTouched(true)
              }}
            />
          </Field>
          <Field label="ملاحظات" htmlFor="appt-notes" hint="تنظيمية بس، مش علاجية">
            <Textarea id="appt-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </Card>

        {sessionType === 'zoom' && !settings.data.fixed_meeting_url && (
          <SoftNotice tone="primary">
            إذا الزوم مش مربوط بعد، الموعد بينحفظ بدون رابط جلسة. بتقدر تربط الزوم أو تحط رابط ثابت من الإعدادات.
          </SoftNotice>
        )}

        {error && <ErrorNotice message={error} />}

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={create.isPending}>
            {create.isPending ? 'بنحفظ...' : 'احفظ'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            رجوع
          </Button>
        </div>
        <p className="text-center text-xs text-muted">
          بعد الحفظ بنفحص التضارب، {sessionType === 'zoom' ? 'بنعمل رابط الزوم، ' : ''}وبنجهّز الرسائل. الوقت:{' '}
          {formatTime(combineDateAndTime(date, time) ?? new Date())}
        </p>
      </form>
    </div>
  )
}
