import { TZDate } from '@date-fns/tz'
import { describe, expect, it } from 'vitest'
import {
  SESSION_ALERT_STATUSES,
  arabicCount,
  clientReplyNotification,
  dailySummaryNotification,
  dueMessagesNotification,
  isSessionAlertDue,
  localClock,
  localDayAndDateText,
  localDayRangeUtc,
  localTimeText,
  minutesUntilText,
  parseTimeOfDay,
  sessionStartingNotification,
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
  it('zonedWallClockToUtc بيطابق @date-fns/tz بالأوقات العادية وحول تغيير التوقيت', () => {
    const cases: [number, number, number, number, number][] = [
      [2026, 10, 20, 8, 0],
      [2026, 12, 15, 8, 0],
      [2026, 10, 25, 0, 0], // ليلة الانتقال للشتوي، قبل التغيير
      [2026, 10, 25, 3, 0], // وبعده
      [2026, 3, 27, 1, 59], // الانتقال للصيفي، قبل القفزة
      [2026, 3, 27, 3, 0], // وبعدها
      [2027, 1, 1, 0, 0],
    ]
    for (const [y, m, d, h, mi] of cases) {
      const expected = new TZDate(y, m - 1, d, h, mi, 0, TZ).getTime()
      expect(zonedWallClockToUtc(y, m, d, h, mi, TZ).getTime()).toBe(expected)
    }
  })

  it('الساعة المكرّرة بالانتقال للشتوي بترجع المرة الأولى، والساعة الناقصة بالصيفي بتتقدّم', () => {
    // 25/10/2026: الساعة 02:00 صيفي بترجع 01:00 شتوي، فـ 01:30 بتمر مرتين (22:30Z ثم 23:30Z). بنختار الأولى.
    // (@date-fns/tz بتجاوب هون حسب منطقة الجهاز اللي بيشغّل الاختبار، فالقيمة مكتوبة صريحة)
    const repeated = zonedWallClockToUtc(2026, 10, 25, 1, 30, TZ)
    expect(repeated.toISOString()).toBe('2026-10-24T22:30:00.000Z')
    expect(localClock(repeated, TZ)).toEqual({ date: '2026-10-25', minutes: 90 })

    // 27/3/2026: الساعة 02:00 بتقفز لـ 03:00، فـ 02:30 مش موجودة وبتصير 03:30 (00:30Z)
    const missing = zonedWallClockToUtc(2026, 3, 27, 2, 30, TZ)
    expect(missing.toISOString()).toBe('2026-03-27T00:30:00.000Z')
    expect(localClock(missing, TZ)).toEqual({ date: '2026-03-27', minutes: 3 * 60 + 30 })
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

describe('تنبيه قبل بداية الجلسة', () => {
  const TZ_IL = 'Asia/Jerusalem'
  // 20/10/2026 لسا صيفي (UTC+3): 13:00Z = 16:00 بالقدس
  const start = new Date('2026-10-20T13:00:00Z')

  it('بيوصل لما نفوت بالنص ساعة قبل الجلسة، ومش قبل ولا بعد البداية', () => {
    expect(isSessionAlertDue(start, new Date('2026-10-20T12:29:59Z'), 30)).toBe(false)
    expect(isSessionAlertDue(start, new Date('2026-10-20T12:30:00Z'), 30)).toBe(true)
    expect(isSessionAlertDue(start, new Date('2026-10-20T12:55:00Z'), 30)).toBe(true)
    expect(isSessionAlertDue(start, new Date('2026-10-20T13:00:00Z'), 30)).toBe(false)
    expect(isSessionAlertDue(start, new Date('2026-10-20T12:45:00Z'), 0)).toBe(false) // 0 = مطفي
  })

  it('النص فيه ساعة الجلسة بالتوقيت المحلي وكم باقي، بدون اسم الزبون', () => {
    expect(sessionStartingNotification(start, new Date('2026-10-20T12:30:00.080Z'), TZ_IL)).toEqual({
      title: 'جلسة قريبة',
      body: 'عندك جلسة الساعة 16:00، بعد نص ساعة.',
    })
    expect(sessionStartingNotification(start, new Date('2026-10-20T12:35:00Z'), TZ_IL).body).toBe('عندك جلسة الساعة 16:00، بعد 25 دقيقة.')
  })

  it('ساعة الجلسة صحيحة بالشتوي كمان (بعد 25/10)', () => {
    // 2/11/2026 شتوي (UTC+2): 14:00Z = 16:00
    expect(localTimeText(new Date('2026-11-02T14:00:00Z'), TZ_IL)).toBe('16:00')
    expect(localTimeText(new Date('2026-10-20T13:00:00Z'), TZ_IL)).toBe('16:00')
  })

  it('صيغ الوقت الباقي', () => {
    expect(minutesUntilText(29.99)).toBe('نص ساعة')
    expect(minutesUntilText(31)).toBe('نص ساعة')
    expect(minutesUntilText(15)).toBe('ربع ساعة')
    expect(minutesUntilText(60)).toBe('ساعة')
    expect(minutesUntilText(27)).toBe('25 دقيقة')
    expect(minutesUntilText(5)).toBe('5 دقايق')
    expect(minutesUntilText(2)).toBe('دقيقتين')
    expect(minutesUntilText(0.4)).toBe('دقيقة')
  })

  it('بس الجلسات القايمة بتاخد تنبيه', () => {
    expect([...SESSION_ALERT_STATUSES].sort()).toEqual(['change_requested', 'confirmed', 'pending'])
  })
})

describe('إشعار رد الزبون', () => {
  const TZ_IL = 'Asia/Jerusalem'
  // الثلاثاء 3/11/2026 شتوي (UTC+2): 14:00Z = 16:00
  const start = new Date('2026-11-03T14:00:00Z')

  it('اليوم والتاريخ بالتوقيت المحلي', () => {
    expect(localDayAndDateText(start, TZ_IL)).toBe('الثلاثاء 03/11')
    // 21:30Z يوم الإثنين = 23:30 بالقدس، نفس اليوم. 22:30Z = 00:30 الثلاثاء
    expect(localDayAndDateText(new Date('2026-11-02T21:30:00Z'), TZ_IL)).toBe('الإثنين 02/11')
    expect(localDayAndDateText(new Date('2026-11-02T22:30:00Z'), TZ_IL)).toBe('الثلاثاء 03/11')
  })

  it('موافق / بدي أغيّر / ما بقدر أجي، بالاسم الأول ونوع الجلسة', () => {
    expect(clientReplyNotification({ type: 'status_changed', to_status: 'confirmed' }, 'ليلى حسن', start, TZ_IL, 'zoom')).toEqual({
      title: 'تأكيد جلسة',
      body: 'ليلى: موافق. جلسة زوم الثلاثاء 03/11 الساعة 16:00.',
    })
    expect(clientReplyNotification({ type: 'status_changed', to_status: 'change_requested' }, 'ليلى حسن', start, TZ_IL, 'in_person')).toEqual({
      title: 'طلب تغيير موعد',
      body: 'ليلى: بدي أغيّر الموعد. جلسة وجاهية الثلاثاء 03/11 الساعة 16:00.',
    })
    expect(clientReplyNotification({ type: 'status_changed', to_status: 'declined' }, ' رامي ', start, TZ_IL, 'zoom')?.body).toBe(
      'رامي: ما بقدر أجي. جلسة زوم الثلاثاء 03/11 الساعة 16:00.',
    )
  })

  it('الوقت انحجز لحدا ثاني', () => {
    expect(clientReplyNotification({ type: 'slot_taken', to_status: 'declined' }, 'ليلى', start, TZ_IL, 'zoom')).toEqual({
      title: 'الوقت انحجز',
      body: 'ليلى: موافق، بس الوقت صار محجوز لحدا ثاني. جلسة زوم الثلاثاء 03/11 الساعة 16:00.',
    })
  })

  it('أحداث مش ردود ما إلها إشعار', () => {
    expect(clientReplyNotification({ type: 'status_changed', to_status: 'pending' }, 'ليلى', start, TZ_IL)).toBeNull()
    expect(clientReplyNotification({ type: 'rescheduled', to_status: 'pending' }, 'ليلى', start, TZ_IL)).toBeNull()
  })

  it('تنبيه النص ساعة بيحكي نوع الجلسة', () => {
    const now = new Date('2026-11-03T13:30:00Z')
    expect(sessionStartingNotification(start, now, TZ_IL, 'in_person').body).toBe('عندك جلسة وجاهية الساعة 16:00، بعد نص ساعة.')
    expect(sessionStartingNotification(start, now, TZ_IL, 'zoom').body).toBe('عندك جلسة زوم الساعة 16:00، بعد نص ساعة.')
  })
})
