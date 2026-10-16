import type { DateSelectArg, DayHeaderContentArg, EventClickArg, EventContentArg, SlotLabelContentArg } from '@fullcalendar/core'
import arLocale from '@fullcalendar/core/locales/ar'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useEffect, useMemo, useRef } from 'react'
import { UserIcon } from '../../components/Icons'
import type { AppointmentWithClient } from '../../lib/database.types'
import { ARABIC_DAY_NAMES, formatTime, fromCalendarUtcDate, roundUpToQuarter, wallClockIso } from '../../lib/dates'
import { STATUS_LABELS } from '../../lib/status'

interface Props {
  view: 'day' | 'week'
  anchor: Date
  appointments: AppointmentWithClient[]
  onSlotClick: (start: Date) => void
  onEventClick: (id: string) => void
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/**
 * التقويم اليومي والأسبوعي. FullCalendar بيشتغل بوضع UTC ومنطعمه أوقات
 * "ساعة الحائط" بتوقيت القدس (انظر dates.ts)، عشان ما نحتاج مكتبة مناطق زمنية.
 */
export function CalendarGrid({ view, anchor, appointments, onSlotClick, onEventClick }: Props) {
  const ref = useRef<FullCalendar>(null)
  const viewName = view === 'day' ? 'timeGridDay' : 'timeGridWeek'

  useEffect(() => {
    const api = ref.current?.getApi()
    if (!api) return
    if (api.view.type !== viewName) api.changeView(viewName, wallClockIso(anchor))
    else api.gotoDate(wallClockIso(anchor))
  }, [viewName, anchor])

  const events = useMemo(
    () =>
      appointments.map((a) => ({
        id: a.id,
        title: a.clients.full_name,
        start: wallClockIso(a.starts_at),
        end: wallClockIso(a.ends_at),
        classNames: [`fc-status-${a.status}`],
        extendedProps: { status: a.status, hasCompanion: a.has_companion, time: formatTime(a.starts_at) },
      })),
    [appointments],
  )

  function renderEvent(arg: EventContentArg) {
    const { status, hasCompanion, time } = arg.event.extendedProps as {
      status: keyof typeof STATUS_LABELS
      hasCompanion: boolean
      time: string
    }
    return (
      <div className="flex h-full flex-col overflow-hidden text-start leading-tight">
        <div className="flex items-center gap-1">
          <span className="truncate text-[13px] font-semibold">{arg.event.title}</span>
          {hasCompanion && <UserIcon width="12" height="12" className="shrink-0" />}
        </div>
        <div className="text-[11px] opacity-90">
          <span dir="ltr">{time}</span> · {STATUS_LABELS[status]}
        </div>
      </div>
    )
  }

  function renderDayHeader(arg: DayHeaderContentArg) {
    const d = arg.date
    return (
      <div className="flex flex-col items-center py-1 leading-tight">
        <span className="text-xs">{ARABIC_DAY_NAMES[d.getUTCDay()]}</span>
        <span className={`text-base ${arg.isToday ? 'font-semibold text-primary' : 'text-ink'}`} dir="ltr">
          {pad(d.getUTCDate())}/{pad(d.getUTCMonth() + 1)}
        </span>
      </div>
    )
  }

  function renderSlotLabel(arg: SlotLabelContentArg) {
    return (
      <span dir="ltr" className="text-xs">
        {pad(arg.date.getUTCHours())}:{pad(arg.date.getUTCMinutes())}
      </span>
    )
  }

  function handleDateClick(info: DateClickArg) {
    onSlotClick(roundUpToQuarter(fromCalendarUtcDate(info.date)))
  }

  function handleSelect(info: DateSelectArg) {
    onSlotClick(roundUpToQuarter(fromCalendarUtcDate(info.start)))
    ref.current?.getApi().unselect()
  }

  function handleEventClick(info: EventClickArg) {
    info.jsEvent.preventDefault()
    onEventClick(info.event.id)
  }

  return (
    <div className={`overflow-x-auto rounded-card border border-border bg-surface ${view === 'week' ? 'pb-1' : ''}`}>
      <div className={view === 'week' ? 'min-w-[640px] sm:min-w-0' : ''}>
        <FullCalendar
          ref={ref}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView={viewName}
          initialDate={wallClockIso(anchor)}
          locale={arLocale}
          direction="rtl"
          firstDay={0}
          timeZone="UTC"
          headerToolbar={false}
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:30:00"
          snapDuration="00:15:00"
          slotLabelInterval="01:00"
          height="auto"
          expandRows={false}
          nowIndicator
          now={() => wallClockIso(new Date())}
          selectable
          selectMirror={false}
          dayMaxEvents={false}
          eventMinHeight={28}
          events={events}
          dateClick={handleDateClick}
          select={handleSelect}
          eventClick={handleEventClick}
          eventContent={renderEvent}
          dayHeaderContent={renderDayHeader}
          slotLabelContent={renderSlotLabel}
          eventDisplay="block"
        />
      </div>
    </div>
  )
}
