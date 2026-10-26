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

/** فرق المنطقة الزمنية عن UTC (بالملي ثانية) بلحظة معيّنة */
function offsetAt(ms: number, timeZone: string): number {
  const p = partsIn(new Date(ms), timeZone)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms
}

/**
 * لحظة حقيقية (UTC) من ساعة حائط بمنطقة زمنية، بدون أي مكتبة.
 * بتجرّب الفرق عن UTC قبل الوقت المطلوب بيوم وبعده بيوم، فبتغطي ليلة تغيير التوقيت:
 * - ساعة بتتكرر (الانتقال للشتوي): بنرجّع المرة الأولى (الأبكر)، زي المتصفح ومكتبات التواريخ.
 * - ساعة مش موجودة (الانتقال للصيفي): بتتقدّم بمقدار القفزة (02:30 بتصير 03:30).
 * النتيجة ثابتة مهما كانت المنطقة الزمنية للجهاز اللي بيشغّل الكود.
 */
export function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const wanted = Date.UTC(year, month - 1, day, hour, minute, 0)
  const DAY = 86_400_000
  const offsetBefore = offsetAt(wanted - DAY, timeZone)
  const offsetAfter = offsetAt(wanted + DAY, timeZone)
  const candidates = [...new Set([wanted - offsetBefore, wanted - offsetAfter])]
    .filter((ms) => offsetAt(ms, timeZone) === wanted - ms)
    .sort((a, b) => a - b)
  // ما في مرشّح صالح = الساعة مش موجودة؛ الفرق اللي كان ساري قبل القفزة بينقلها لبعدها
  return new Date(candidates[0] ?? wanted - offsetBefore)
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

// -----------------------------------------------------------------------------
// تنبيه قبل بداية الجلسة (افتراضي نص ساعة، settings.session_alert_minutes)
// -----------------------------------------------------------------------------

/** حالات الجلسة اللي لسا قايمة، فبينبعت عنها تنبيه قبل البداية */
export const SESSION_ALERT_STATUSES = ['pending', 'confirmed', 'change_requested'] as const

/** "16:00" بالتوقيت المحلي */
export function localTimeText(at: Date, timeZone: string): string {
  const p = partsIn(at, timeZone)
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}

/** "نص ساعة"، "ربع ساعة"، "25 دقيقة"... فوق الـ10 دقايق بتتقرّب لأقرب 5 (المجدول بيشتغل كل 5 دقايق) */
export function minutesUntilText(minutes: number): string {
  const n = minutes > 10 ? Math.round(minutes / 5) * 5 : Math.max(1, Math.round(minutes))
  if (n === 15) return 'ربع ساعة'
  if (n === 30) return 'نص ساعة'
  if (n === 60) return 'ساعة'
  if (n === 120) return 'ساعتين'
  return arabicCount(n, { one: 'دقيقة', two: 'دقيقتين', few: 'دقايق', many: 'دقيقة' })
}

/** هل لازم ينبعت تنبيه البداية هلأ؟ (الجلسة لسا ما بلّشت، ودخلنا بفترة التنبيه) */
export function isSessionAlertDue(startsAt: Date, now: Date, alertMinutes: number): boolean {
  if (!(alertMinutes > 0)) return false
  const start = startsAt.getTime()
  return start > now.getTime() && start - alertMinutes * 60_000 <= now.getTime()
}

export type SessionType = 'zoom' | 'in_person'

/** "جلسة زوم" / "جلسة وجاهية" */
export function sessionLabel(sessionType?: SessionType | string | null): string {
  if (sessionType === 'in_person') return 'جلسة وجاهية'
  if (sessionType === 'zoom') return 'جلسة زوم'
  return 'جلسة'
}

/**
 * "عندك جلسة وجاهية الساعة 16:00، بعد نص ساعة." (بدون اسم الزبون، عشان الخصوصية على شاشة القفل)
 */
export function sessionStartingNotification(
  startsAt: Date,
  now: Date,
  timeZone: string,
  sessionType?: SessionType | string | null,
): { title: string; body: string } {
  const minutes = (startsAt.getTime() - now.getTime()) / 60_000
  return {
    title: 'جلسة قريبة',
    body: `عندك ${sessionLabel(sessionType)} الساعة ${localTimeText(startsAt, timeZone)}، بعد ${minutesUntilText(minutes)}.`,
  }
}

// -----------------------------------------------------------------------------
// إشعار لما الزبون يرد من صفحته (موافق / بدي أغيّر / ما بقدر أجي)
// -----------------------------------------------------------------------------

/** نفس أسماء الأيام اللي بالتطبيق (src/lib/dates.ts) */
const ARABIC_DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] as const

/** "الثلاثاء 28/10" بالتوقيت المحلي */
export function localDayAndDateText(at: Date, timeZone: string): string {
  const p = partsIn(at, timeZone)
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()
  return `${ARABIC_DAY_NAMES[weekday]} ${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}`
}

export interface ClientReplyEvent {
  /** status_changed أو slot_taken */
  type: string
  to_status: string | null
}

/** نفس كلام الأزرار اللي الزبون كبسها، فما بيحتاج تذكير ولا تأنيث */
const REPLY_TEXT: Record<string, { title: string; phrase: string }> = {
  confirmed: { title: 'تأكيد جلسة', phrase: 'موافق' },
  change_requested: { title: 'طلب تغيير موعد', phrase: 'بدي أغيّر الموعد' },
  declined: { title: 'اعتذار عن جلسة', phrase: 'ما بقدر أجي' },
}

/**
 * "ليلى: موافق. جلسة زوم الثلاثاء 28/10 الساعة 16:00."
 * الاسم الأول بس (سامية اختارت يبيّن)، وملاحظة الزبون ما بتطلع بالإشعار.
 * بيرجع null لأحداث مش ردود.
 */
export function clientReplyNotification(
  event: ClientReplyEvent,
  clientFullName: string,
  startsAt: Date,
  timeZone: string,
  sessionType?: SessionType | string | null,
): { title: string; body: string } | null {
  const first = clientFullName.trim().split(/\s+/)[0] || 'زبون'
  const when = `${sessionLabel(sessionType)} ${localDayAndDateText(startsAt, timeZone)} الساعة ${localTimeText(startsAt, timeZone)}`
  if (event.type === 'slot_taken') {
    return { title: 'الوقت انحجز', body: `${first}: موافق، بس الوقت صار محجوز لحدا ثاني. ${when}.` }
  }
  if (event.type !== 'status_changed' || !event.to_status) return null
  const text = REPLY_TEXT[event.to_status]
  if (!text) return null
  return { title: text.title, body: `${first}: ${text.phrase}. ${when}.` }
}
