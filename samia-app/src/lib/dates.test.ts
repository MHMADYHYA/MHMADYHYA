import { describe, expect, it } from 'vitest'
import {
  addDaysApp,
  appDate,
  combineDateAndTime,
  dayKey,
  durationLabel,
  endOfDayApp,
  formatDate,
  formatDateTime,
  formatDayAndDate,
  formatDayName,
  formatMonthYear,
  formatShortDayDate,
  formatTime,
  fromCalendarUtcDate,
  fromWallClock,
  greetingFor,
  relativeDayLabel,
  roundUpToQuarter,
  splitWallClock,
  startOfDayApp,
  startOfMonthApp,
  startOfWeekApp,
  timeAgoLabel,
  toCalendarUtcDate,
  wallClockIso,
  wallClockLocalInput,
} from './dates'

describe('تنسيق التاريخ والوقت بتوقيت القدس', () => {
  it('بالتوقيت الصيفي (UTC+3)', () => {
    const d = new Date('2026-10-20T07:00:00Z')
    expect(formatDayName(d)).toBe('الثلاثاء')
    expect(formatDate(d)).toBe('20/10/2026')
    expect(formatTime(d)).toBe('10:00')
    expect(formatDayAndDate(d)).toBe('الثلاثاء 20/10/2026')
    expect(formatDateTime(d)).toBe('الثلاثاء 20/10/2026، 10:00')
    expect(formatShortDayDate(d)).toBe('الثلاثاء 20/10')
    expect(formatMonthYear(d)).toBe('تشرين الأول 2026')
  })

  it('بالتوقيت الشتوي (UTC+2)', () => {
    const d = new Date('2026-12-15T07:00:00Z')
    expect(formatTime(d)).toBe('09:00')
    expect(formatDayName(d)).toBe('الثلاثاء')
    expect(formatDate(d)).toBe('15/12/2026')
  })

  it('اليوم بيتغيّر عند منتصف الليل بتوقيت القدس مش UTC', () => {
    const d = new Date('2026-10-20T22:30:00Z')
    expect(formatDate(d)).toBe('21/10/2026')
    expect(dayKey(d)).toBe('2026-10-21')
    expect(formatTime(d)).toBe('01:30')
  })

  it('بيقبل نص ISO ورقم', () => {
    expect(formatTime('2026-10-20T07:00:00Z')).toBe('10:00')
    expect(formatTime(Date.parse('2026-10-20T07:00:00Z'))).toBe('10:00')
  })
})

describe('التحية حسب الوقت', () => {
  it('صباح الخير قبل 12 الظهر ومسا الخير بعدها', () => {
    expect(greetingFor(new Date('2026-10-20T05:00:00Z'))).toBe('صباح الخير، سامية')
    expect(greetingFor(new Date('2026-10-20T09:00:00Z'))).toBe('مسا الخير، سامية')
    expect(greetingFor(new Date('2026-10-20T05:00:00Z'), 'ليلى')).toBe('صباح الخير، ليلى')
  })
})

describe('ساعة الحائط والتقويم', () => {
  it('appDate وfromWallClock بيعطوا اللحظة الصحيحة صيفاً وشتاءً', () => {
    expect(appDate(2026, 9, 20, 10, 0).toISOString()).toBe('2026-10-20T07:00:00.000Z')
    expect(appDate(2026, 11, 15, 9, 0).toISOString()).toBe('2026-12-15T07:00:00.000Z')
    expect(fromWallClock('2026-10-20T10:00')?.toISOString()).toBe('2026-10-20T07:00:00.000Z')
    expect(fromWallClock('2026-10-20 10:00:30')?.toISOString()).toBe('2026-10-20T07:00:30.000Z')
    expect(fromWallClock('2026-10-20')?.toISOString()).toBe('2026-10-19T21:00:00.000Z')
    expect(fromWallClock('20/10/2026')).toBeNull()
    expect(combineDateAndTime('2026-10-20', '10:15')?.toISOString()).toBe('2026-10-20T07:15:00.000Z')
  })

  it('wallClockIso وsplitWallClock', () => {
    const d = new Date('2026-10-20T07:05:00Z')
    expect(wallClockIso(d)).toBe('2026-10-20T10:05:00')
    expect(wallClockLocalInput(d)).toBe('2026-10-20T10:05')
    expect(splitWallClock(d)).toEqual({ date: '2026-10-20', time: '10:05' })
  })

  it('تحويل FullCalendar (UTC = ساعة الحائط) رايح جاي', () => {
    const instant = new Date('2026-10-20T07:00:00Z')
    const cal = toCalendarUtcDate(instant)
    expect(cal.toISOString()).toBe('2026-10-20T10:00:00.000Z')
    expect(fromCalendarUtcDate(cal).toISOString()).toBe(instant.toISOString())
    const winter = new Date('2026-12-15T07:00:00Z')
    expect(fromCalendarUtcDate(toCalendarUtcDate(winter)).toISOString()).toBe(winter.toISOString())
  })

  it('يوم الانتقال للتوقيت الشتوي (25/10/2026) بيضل 25 ساعة', () => {
    const start = startOfDayApp('2026-10-25T05:00:00Z')
    const end = endOfDayApp('2026-10-25T05:00:00Z')
    expect(start.toISOString()).toBe('2026-10-24T21:00:00.000Z')
    expect(end.toISOString()).toBe('2026-10-25T22:00:00.000Z')
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25)
  })
})

describe('حدود الأيام والأسابيع والشهور', () => {
  it('الأسبوع بيبلّش الأحد', () => {
    // الثلاثاء 20/10/2026 → الأحد 18/10/2026
    expect(dayKey(startOfWeekApp('2026-10-20T07:00:00Z'))).toBe('2026-10-18')
    expect(formatDayName(startOfWeekApp('2026-10-18T07:00:00Z'))).toBe('الأحد')
    expect(dayKey(startOfWeekApp('2026-10-24T20:59:00Z'))).toBe('2026-10-18')
  })

  it('بداية الشهر وإضافة أيام', () => {
    expect(startOfMonthApp('2026-10-20T07:00:00Z').toISOString()).toBe('2026-09-30T21:00:00.000Z')
    expect(dayKey(addDaysApp('2026-10-31T07:00:00Z', 1))).toBe('2026-11-01')
  })

  it('تقريب لربع ساعة لفوق', () => {
    expect(formatTime(roundUpToQuarter('2026-10-20T07:01:00Z'))).toBe('10:15')
    expect(formatTime(roundUpToQuarter('2026-10-20T07:15:00Z'))).toBe('10:15')
    expect(formatTime(roundUpToQuarter('2026-10-20T07:46:00Z'))).toBe('11:00')
  })
})

describe('نصوص مساعدة', () => {
  it('المدة', () => {
    expect(durationLabel(45)).toBe('45 دقيقة')
    expect(durationLabel(60)).toBe('ساعة')
    expect(durationLabel(90)).toBe('ساعة ونص')
    expect(durationLabel(120)).toBe('ساعتين')
    expect(durationLabel(135)).toBe('ساعتين و15 دقيقة')
    expect(durationLabel(180)).toBe('3 ساعات')
  })

  it('اليوم النسبي', () => {
    const now = new Date('2026-10-20T07:00:00Z')
    expect(relativeDayLabel('2026-10-20T15:00:00Z', now)).toBe('اليوم')
    expect(relativeDayLabel('2026-10-21T05:00:00Z', now)).toBe('بكرا')
    expect(relativeDayLabel('2026-10-19T05:00:00Z', now)).toBe('مبارح')
    expect(relativeDayLabel('2026-10-25T05:00:00Z', now)).toBe('الأحد 25/10')
  })

  it('قبل كم', () => {
    const now = new Date('2026-10-20T07:00:00Z')
    expect(timeAgoLabel('2026-10-20T06:59:30Z', now)).toBe('هلأ')
    expect(timeAgoLabel('2026-10-20T06:55:00Z', now)).toBe('قبل 5 دقايق')
    expect(timeAgoLabel('2026-10-20T05:00:00Z', now)).toBe('قبل ساعتين')
    expect(timeAgoLabel('2026-10-17T07:00:00Z', now)).toBe('قبل 3 أيام')
  })
})
