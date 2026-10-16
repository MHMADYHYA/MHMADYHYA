import { useMemo } from 'react'
import { AppointmentRow } from '../../components/AppointmentRow'
import { EmptyState } from '../../components/Feedback'
import { Input, Select } from '../../components/Input'
import { SearchIcon } from '../../components/Icons'
import type { AppointmentStatus, AppointmentWithClient } from '../../lib/database.types'
import { dayKey, formatShortDayDate, relativeDayLabel } from '../../lib/dates'
import { APPOINTMENT_STATUSES, STATUS_LABELS } from '../../lib/status'

export type ListPeriod = 'upcoming' | 'this_week' | 'this_month' | 'past'

export const PERIOD_LABELS: Record<ListPeriod, string> = {
  upcoming: 'القادمة',
  this_week: 'هالأسبوع',
  this_month: 'هالشهر',
  past: 'اللي مرقت',
}

export interface ListFilters {
  period: ListPeriod
  status: AppointmentStatus | 'all'
  search: string
}

interface Props {
  appointments: AppointmentWithClient[]
  filters: ListFilters
  onFiltersChange: (f: ListFilters) => void
  now: Date
}

function sessionsCount(n: number): string {
  if (n === 1) return 'جلسة وحدة'
  if (n === 2) return 'جلستين'
  if (n <= 10) return `${n} جلسات`
  return `${n} جلسة`
}

/** قائمة المواعيد المجمّعة حسب اليوم مع فلاتر (مكوّن خاص، مش عرض القائمة تبع FullCalendar) */
export function AppointmentList({ appointments, filters, onFiltersChange, now }: Props) {
  const groups = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    const filtered = appointments.filter((a) => {
      if (filters.status !== 'all' && a.status !== filters.status) return false
      if (q && !a.clients.full_name.toLowerCase().includes(q) && !a.clients.phone.includes(q)) return false
      return true
    })
    const sorted = [...filtered].sort((x, y) =>
      filters.period === 'past'
        ? new Date(y.starts_at).getTime() - new Date(x.starts_at).getTime()
        : new Date(x.starts_at).getTime() - new Date(y.starts_at).getTime(),
    )
    const map = new Map<string, AppointmentWithClient[]>()
    for (const a of sorted) {
      const key = dayKey(a.starts_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return [...map.entries()]
  }, [appointments, filters])

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Select
          aria-label="الفترة"
          value={filters.period}
          onChange={(e) => onFiltersChange({ ...filters, period: e.target.value as ListPeriod })}
        >
          {(Object.keys(PERIOD_LABELS) as ListPeriod[]).map((p) => (
            <option key={p} value={p}>
              {PERIOD_LABELS[p]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="الحالة"
          value={filters.status}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as ListFilters['status'] })}
        >
          <option value="all">كل الحالات</option>
          {APPOINTMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <div className="relative col-span-2">
          <SearchIcon className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            aria-label="بحث باسم الزبون"
            placeholder="بحث باسم الزبون"
            className="ps-10"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          text={filters.period === 'past' ? 'ما في جلسات بهاي الفترة' : 'يوم هادي، ما في جلسات'}
          hint={filters.search || filters.status !== 'all' ? 'جرّب تغيّر الفلاتر' : undefined}
        />
      ) : (
        groups.map(([key, items]) => (
          <section key={key} aria-label={formatShortDayDate(items[0].starts_at)}>
            <div className="mb-1.5 flex items-baseline justify-between px-1">
              <h3 className="font-semibold">
                {relativeDayLabel(items[0].starts_at, now)}
                {relativeDayLabel(items[0].starts_at, now) !== formatShortDayDate(items[0].starts_at) && (
                  <span className="ms-2 text-sm font-normal text-muted">{formatShortDayDate(items[0].starts_at)}</span>
                )}
              </h3>
              <span className="text-sm text-muted">{sessionsCount(items.length)}</span>
            </div>
            <div className="space-y-2">
              {items.map((a) => (
                <AppointmentRow key={a.id} appointment={a} now={now} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
