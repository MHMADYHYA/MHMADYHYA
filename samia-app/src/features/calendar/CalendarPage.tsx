import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Segmented } from '../../components/Controls'
import { ErrorNotice, Spinner } from '../../components/Feedback'
import { ChevronLeftIcon, ChevronRightIcon, FlagIcon, MessageIcon } from '../../components/Icons'
import { useAppointmentsInRange } from '../../hooks/queries'
import { useBadgeCounts } from '../../hooks/useBadgeCounts'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useNow } from '../../hooks/useNow'
import {
  addDaysApp,
  addMonthsApp,
  endOfDayApp,
  formatDate,
  formatDayAndDate,
  startOfDayApp,
  startOfMonthApp,
  startOfWeekApp,
  wallClockLocalInput,
} from '../../lib/dates'
import { arabicCount, messagesCountText } from '../../../supabase/functions/_shared/notify-core'
import { AppointmentList, type ListFilters } from './AppointmentList'
import { CalendarGrid } from './CalendarGrid'

type View = 'day' | 'week' | 'list'

function messagesText(n: number) {
  return `${messagesCountText(n)} لازم ${n === 2 ? 'ينبعتوا' : 'تنبعت'}`
}
function followUpText(n: number) {
  const count = arabicCount(n, { one: 'موعد واحد', two: 'موعدين', few: 'مواعيد', many: 'موعد' })
  return `${count} ${n === 1 || n > 10 ? 'بده' : n === 2 ? 'بدهم' : 'بدها'} متابعة`
}

export function CalendarPage() {
  const now = useNow()
  const navigate = useNavigate()
  const [view, setView] = useLocalStorage<View>('samia.calendarView', 'week')
  const [anchor, setAnchor] = useState<Date>(() => startOfDayApp(new Date()))
  const [filters, setFilters] = useState<ListFilters>({ period: 'upcoming', status: 'all', search: '' })
  const counts = useBadgeCounts(now)

  const range = useMemo(() => {
    if (view === 'day') return { start: startOfDayApp(anchor), end: endOfDayApp(anchor) }
    if (view === 'week') {
      const start = startOfWeekApp(anchor)
      return { start, end: addDaysApp(start, 7) }
    }
    const today = startOfDayApp(now)
    switch (filters.period) {
      case 'upcoming':
        return { start: today, end: addDaysApp(today, 365) }
      case 'this_week': {
        const start = startOfWeekApp(now)
        return { start, end: addDaysApp(start, 7) }
      }
      case 'this_month': {
        const start = startOfMonthApp(now)
        return { start, end: addMonthsApp(start, 1) }
      }
      case 'past':
        // النهاية = آخر اليوم عشان مفتاح الاستعلام ما يتغير كل دقيقة؛ الفلترة بالوقت الحالي جوا القائمة
        return { start: addDaysApp(today, -365), end: endOfDayApp(now) }
    }
  }, [view, anchor, filters.period, now])

  const appointments = useAppointmentsInRange(range.start, range.end)

  const title =
    view === 'day'
      ? formatDayAndDate(anchor)
      : view === 'week'
        ? `${formatDate(range.start)} – ${formatDate(addDaysApp(range.end, -1))}`
        : 'قائمة المواعيد'

  function step(direction: 1 | -1) {
    setAnchor((d) => addDaysApp(d, (view === 'day' ? 1 : 7) * direction))
  }

  return (
    <div className="space-y-3">
      {(counts.messages > 0 || counts.followUp > 0) && (
        <div className="flex flex-wrap gap-2">
          {counts.messages > 0 && (
            <Link
              to="/messages"
              className="inline-flex min-h-11 items-center gap-2 rounded-button bg-coral-soft px-3.5 text-sm font-semibold text-coral-text"
            >
              <MessageIcon width="18" height="18" />
              {messagesText(counts.messages)}
            </Link>
          )}
          {counts.followUp > 0 && (
            <Link
              to="/follow-up"
              className="inline-flex min-h-11 items-center gap-2 rounded-button bg-primary-soft px-3.5 text-sm font-semibold text-primary"
            >
              <FlagIcon width="18" height="18" />
              {followUpText(counts.followUp)}
            </Link>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          ariaLabel="طريقة العرض"
          value={view}
          onChange={setView}
          options={[
            { value: 'day', label: 'يومي' },
            { value: 'week', label: 'أسبوعي' },
            { value: 'list', label: 'قائمة' },
          ]}
        />
        {view !== 'list' && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAnchor(startOfDayApp(now))}
              className="min-h-10 rounded-button bg-primary-soft px-3 text-sm font-semibold text-primary"
            >
              اليوم
            </button>
            <button
              type="button"
              aria-label={view === 'day' ? 'اليوم السابق' : 'الأسبوع السابق'}
              onClick={() => step(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-button text-ink hover:bg-page-tint"
            >
              <ChevronRightIcon />
            </button>
            <button
              type="button"
              aria-label={view === 'day' ? 'اليوم التالي' : 'الأسبوع التالي'}
              onClick={() => step(1)}
              className="flex h-10 w-10 items-center justify-center rounded-button text-ink hover:bg-page-tint"
            >
              <ChevronLeftIcon />
            </button>
          </div>
        )}
      </div>

      <h1 className="text-lg font-semibold">{title}</h1>

      {appointments.isError && <ErrorNotice message={(appointments.error as Error).message} onRetry={() => void appointments.refetch()} />}

      {view === 'list' ? (
        appointments.isPending ? (
          <Spinner />
        ) : (
          <AppointmentList appointments={appointments.data ?? []} filters={filters} onFiltersChange={setFilters} now={now} />
        )
      ) : (
        <>
          {appointments.isPending && <Spinner label="بنحمّل المواعيد..." />}
          <CalendarGrid
            view={view}
            anchor={anchor}
            appointments={appointments.data ?? []}
            onSlotClick={(start) => navigate(`/appointments/new?start=${encodeURIComponent(wallClockLocalInput(start))}`)}
            onEventClick={(id) => navigate(`/appointments/${id}`)}
          />
          <p className="text-center text-xs text-muted">كبسة على مكان فاضي بالتقويم بتفتح موعد جديد بنفس الوقت</p>
        </>
      )}
    </div>
  )
}
