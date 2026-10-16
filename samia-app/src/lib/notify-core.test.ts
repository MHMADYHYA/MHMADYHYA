import { TZDate } from '@date-fns/tz'
import { describe, expect, it } from 'vitest'
import {
  arabicCount,
  dailySummaryNotification,
  dueMessagesNotification,
  localClock,
  localDayRangeUtc,
  parseTimeOfDay,
  shouldSendDailySummary,
  zonedWallClockToUtc,
} from '../../supabase/functions/_shared/notify-core'

const TZ = 'Asia/Jerusalem'

describe('الساعة المحلية', () => {
  it('صيفاً وشتاءً', () => {
    expect(localClock(new Date('2026-10-20T05:00:00Z'), TZ)).toEqual({ date: '2026-10-20', minutes: 8 * 60 })
    expect(localClock(new Date('2026-12-15T06:00:00Z'), TZ)).toEqual({ date: '2026-12-15', minutes: 8 * 60 })
    expect(localClock(new Date('2026-10-20T22:30:00Z'), TZ)).toEqual({ date: '2026-10-21', minutes: 90 })
  })

  it('zonedWallClockToUtc بيطابق @date-fns/tz حتى حول تغيير التوقيت', () => {
    const cases: [number, number, number, number, number][] = [
      [2026, 10, 20, 8, 0],
      [2026, 12, 15, 8, 0],
      [2026, 10, 25, 1, 30], // ليلة الانتقال للشتوي
      [2026, 10, 25, 3, 0],
      [2026, 3, 27, 3, 0], // الانتقال للصيفي
      [2027, 1, 1, 0, 0],
    ]
    for (const [y, m, d, h, mi] of cases) {
      const expected = new TZDate(y, m - 1, d, h, mi, 0, TZ).getTime()
      expect(zonedWallClockToUtc(y, m, d, h, mi, TZ).getTime()).toBe(expected)
    }
  })

  it('نطاق اليوم المحلي', () => {
    const range = localDayRangeUtc(new Date('2026-10-25T05:00:00Z'), TZ)
    expect(range.start.toISOString()).toBe('2026-10-24T21:00:00.000Z')
    expect(range.end.toISOString()).toBe('2026-10-25T22:00:00.000Z')
  })

  it('parseTimeOfDay', () => {
    expect(parseTimeOfDay('08:00')).toBe(480)
    expect(parseTimeOfDay('08:30:00')).toBe(510)
    expect(parseTimeOfDay('7:15')).toBe(435)
    expect(parseTimeOfDay('غلط')).toBe(480)
  })
})

describe('ملخص الصبح: متى ينبعت', () => {
  const base = { daily_summary_enabled: true, daily_summary_time: '08:00', daily_summary_last_sent_on: null, timezone: TZ }

  it('بينبعت بعد 8:00 بتوقيت القدس مرة وحدة باليوم', () => {
    expect(shouldSendDailySummary(base, new Date('2026-10-20T04:59:00Z'))).toEqual({ send: false, today: '2026-10-20' })
    expect(shouldSendDailySummary(base, new Date('2026-10-20T05:03:00Z'))).toEqual({ send: true, today: '2026-10-20' })
    expect(
      shouldSendDailySummary({ ...base, daily_summary_last_sent_on: '2026-10-20' }, new Date('2026-10-20T05:10:00Z')),
    ).toEqual({ send: false, today: '2026-10-20' })
    expect(
      shouldSendDailySummary({ ...base, daily_summary_last_sent_on: '2026-10-19' }, new Date('2026-10-20T05:10:00Z')).send,
    ).toBe(true)
  })

  it('بالتوقيت الشتوي 8:00 = 06:00Z', () => {
    expect(shouldSendDailySummary(base, new Date('2026-12-15T05:30:00Z')).send).toBe(false)
    expect(shouldSendDailySummary(base, new Date('2026-12-15T06:02:00Z')).send).toBe(true)
  })

  it('ما بينبعت متأخر كثير (بعد فترة السماح) ولا لما يكون مطفي', () => {
    expect(shouldSendDailySummary(base, new Date('2026-10-20T12:00:00Z')).send).toBe(false)
    expect(shouldSendDailySummary({ ...base, daily_summary_enabled: false }, new Date('2026-10-20T05:03:00Z')).send).toBe(false)
  })

  it('ساعة مخصصة', () => {
    const s = { ...base, daily_summary_time: '21:30' }
    expect(shouldSendDailySummary(s, new Date('2026-10-20T18:29:00Z')).send).toBe(false)
    expect(shouldSendDailySummary(s, new Date('2026-10-20T18:31:00Z')).send).toBe(true)
  })
})

describe('نصوص التنبيهات', () => {
  it('صيغ الجمع', () => {
    expect(arabicCount(1, { one: 'رسالة وحدة', two: 'رسالتين', few: 'رسائل', many: 'رسالة' })).toBe('رسالة وحدة')
    expect(arabicCount(2, { one: 'رسالة وحدة', two: 'رسالتين', few: 'رسائل', many: 'رسالة' })).toBe('رسالتين')
    expect(arabicCount(5, { one: 'رسالة وحدة', two: 'رسالتين', few: 'رسائل', many: 'رسالة' })).toBe('5 رسائل')
    expect(arabicCount(11, { one: 'رسالة وحدة', two: 'رسالتين', few: 'رسائل', many: 'رسالة' })).toBe('11 رسالة')
  })

  it('رسائل لازم تنبعت', () => {
    expect(dueMessagesNotification(3).body).toBe('عندك 3 رسائل لازم تنبعت')
    expect(dueMessagesNotification(1).body).toBe('عندك رسالة وحدة لازم تنبعت')
  })

  it('ملخص الصبح', () => {
    expect(dailySummaryNotification(3, 2).body).toBe('صباح الخير، اليوم عندك 3 جلسات، ورسالتين لازم ينبعتوا.')
    expect(dailySummaryNotification(1, 0).body).toBe('صباح الخير، اليوم عندك جلسة وحدة.')
    expect(dailySummaryNotification(0, 0).body).toBe('صباح الخير، ما عندك جلسات اليوم.')
    expect(dailySummaryNotification(0, 4).body).toBe('صباح الخير، ما عندك جلسات اليوم، و4 رسائل لازم تنبعت.')
  })
})
