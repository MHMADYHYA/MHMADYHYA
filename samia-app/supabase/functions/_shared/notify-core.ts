/**
 * منطق التنبيهات (القسم 11) بدون أي اعتماديات، عشان ينختبر بـ Vitest
 * وينستعمل بـ Edge Function notify-due (Deno).
 */

export interface LocalClock {
  /** YYYY-MM-DD */
  date: string
  /** دقايق من منتصف الليل بالتوقيت المحلي */
  minutes: number
}

function partsIn(now: Date, timeZone: string): Record<string, number> {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const out: Record<string, number> = {}
  for (const p of fmt.formatToParts(now)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value)
  }
  if (out.hour === 24) out.hour = 0
  return out
}

/** التاريخ والساعة المحلية بمنطقة زمنية معيّنة */
export function localClock(now: Date, timeZone: string): LocalClock {
  const p = partsIn(now, timeZone)
  const date = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
  return { date, minutes: p.hour * 60 + p.minute }
}

/** '08:00' أو '08:00:00' → دقايق */
export function parseTimeOfDay(text: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(text.trim())
  if (!m) return 8 * 60
  return Number(m[1]) * 60 + Number(m[2])
}

/**
 * لحظة حقيقية (UTC) من ساعة حائط بمنطقة زمنية. بتتعامل مع التوقيت الصيفي والشتوي
 * بتصحيح الفرق مرتين.
 */
export function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  let guess = Date.UTC(year, month - 1, day, hour, minute, 0)
  for (let i = 0; i < 2; i++) {
    const p = partsIn(new Date(guess), timeZone)
    const seen = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
    const wanted = Date.UTC(year, month - 1, day, hour, minute, 0)
    guess += wanted - seen
  }
  return new Date(guess)
}

/** بداية ونهاية (حصرية) اليوم المحلي الحالي بالـUTC */
export function localDayRangeUtc(now: Date, timeZone: string): { start: Date; end: Date } {
  const p = partsIn(now, timeZone)
  const start = zonedWallClockToUtc(p.year, p.month, p.day, 0, 0, timeZone)
  const nextDay = new Date(Date.UTC(p.year, p.month - 1, p.day + 1))
  const end = zonedWallClockToUtc(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate(), 0, 0, timeZone)
  return { start, end }
}

export interface DailySummarySettings {
  daily_summary_enabled: boolean
  daily_summary_time: string
  daily_summary_last_sent_on: string | null
  timezone: string
}

/**
 * هل لازم ينبعت ملخص الصبح هلأ؟ مرة وحدة باليوم، بعد الساعة المحددة،
 * وبس خلال فترة سماح (افتراضي 3 ساعات) عشان ما يوصل "صباح الخير" بالليل.
 */
export function shouldSendDailySummary(
  settings: DailySummarySettings,
  now: Date,
  graceMinutes = 180,
): { send: boolean; today: string } {
  const clock = localClock(now, settings.timezone || 'Asia/Jerusalem')
  if (!settings.daily_summary_enabled) return { send: false, today: clock.date }
  if (settings.daily_summary_last_sent_on === clock.date) return { send: false, today: clock.date }
  const target = parseTimeOfDay(settings.daily_summary_time)
  const send = clock.minutes >= target && clock.minutes < target + graceMinutes
  return { send, today: clock.date }
}

interface PluralForms {
  one: string
  two: string
  few: string
  many: string
}

/** صيغ الجمع بالعربي: 1، 2، 3-10، 11+ */
export function arabicCount(n: number, forms: PluralForms): string {
  if (n === 1) return forms.one
  if (n === 2) return forms.two
  if (n >= 3 && n <= 10) return `${n} ${forms.few}`
  return `${n} ${forms.many}`
}

export function messagesCountText(n: number): string {
  return arabicCount(n, { one: 'رسالة وحدة', two: 'رسالتين', few: 'رسائل', many: 'رسالة' })
}

export function sessionsCountText(n: number): string {
  return arabicCount(n, { one: 'جلسة وحدة', two: 'جلستين', few: 'جلسات', many: 'جلسة' })
}

/** "عندك 3 رسائل لازم تنبعت" */
export function dueMessagesNotification(n: number): { title: string; body: string } {
  return {
    title: 'رسائل لازم تنبعت',
    body: `عندك ${messagesCountText(n)} لازم ${n === 2 ? 'ينبعتوا' : 'تنبعت'}`,
  }
}

/** "صباح الخير، اليوم عندك 3 جلسات، و2 رسائل لازم تنبعت." */
export function dailySummaryNotification(sessions: number, messages: number): { title: string; body: string } {
  if (sessions === 0 && messages === 0) {
    return { title: 'صباح الخير', body: 'صباح الخير، ما عندك جلسات اليوم.' }
  }
  const sessionsPart = sessions === 0 ? 'ما عندك جلسات اليوم' : `اليوم عندك ${sessionsCountText(sessions)}`
  const messagesPart =
    messages === 0 ? '' : `، و${messagesCountText(messages)} لازم ${messages === 2 ? 'ينبعتوا' : 'تنبعت'}`
  return { title: 'صباح الخير', body: `صباح الخير، ${sessionsPart}${messagesPart}.` }
}
