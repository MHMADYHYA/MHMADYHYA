import { TZDate } from '@date-fns/tz'
import { addDays, addMonths, format, startOfDay, startOfMonth, startOfWeek } from 'date-fns'

/** كل الأوقات بتنعرض بتوقيت القدس (القسم 6 من الخطة) */
export const APP_TIMEZONE = 'Asia/Jerusalem'

export const ARABIC_DAY_NAMES = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
] as const

export const ARABIC_MONTH_NAMES = [
  'كانون الثاني',
  'شباط',
  'آذار',
  'نيسان',
  'أيار',
  'حزيران',
  'تموز',
  'آب',
  'أيلول',
  'تشرين الأول',
  'تشرين الثاني',
  'كانون الأول',
] as const

export type DateInput = Date | string | number

/** تحويل أي تاريخ لتاريخ بتوقيت التطبيق */
export function toAppTime(value: DateInput): TZDate {
  const date = value instanceof Date ? value : new Date(value)
  return new TZDate(date, APP_TIMEZONE)
}

/** تاريخ من مكوّنات بتوقيت التطبيق (الشهر من 0) */
export function appDate(year: number, month: number, day: number, hours = 0, minutes = 0, seconds = 0): Date {
  return new Date(new TZDate(year, month, day, hours, minutes, seconds, APP_TIMEZONE).getTime())
}

/** اسم اليوم بالعربي، مثلاً "الثلاثاء" */
export function formatDayName(value: DateInput): string {
  return ARABIC_DAY_NAMES[toAppTime(value).getDay()]
}

/** التاريخ بصيغة 20/10/2026 */
export function formatDate(value: DateInput): string {
  return format(toAppTime(value), 'dd/MM/yyyy')
}

/** الساعة بصيغة 24 ساعة، مثلاً 10:00 */
export function formatTime(value: DateInput): string {
  return format(toAppTime(value), 'HH:mm')
}

/** "الثلاثاء 20/10/2026" */
export function formatDayAndDate(value: DateInput): string {
  return `${formatDayName(value)} ${formatDate(value)}`
}

/** "الثلاثاء 20/10/2026، 10:00" */
export function formatDateTime(value: DateInput): string {
  return `${formatDayAndDate(value)}، ${formatTime(value)}`
}

/** "الأحد 20/10" */
export function formatShortDayDate(value: DateInput): string {
  return `${formatDayName(value)} ${format(toAppTime(value), 'dd/MM')}`
}

/** "تشرين الأول 2026" */
export function formatMonthYear(value: DateInput): string {
  const d = toAppTime(value)
  return `${ARABIC_MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

/** تحية حسب الوقت بتوقيت القدس */
export function greetingFor(value: DateInput, name = 'سامية'): string {
  const hour = toAppTime(value).getHours()
  const greeting = hour < 12 ? 'صباح الخير' : 'مسا الخير'
  return `${greeting}، ${name}`
}

/** 'yyyy-MM-dd' بتوقيت التطبيق، لتجميع المواعيد حسب اليوم */
export function dayKey(value: DateInput): string {
  return format(toAppTime(value), 'yyyy-MM-dd')
}

/** 'yyyy-MM-ddTHH:mm:ss' بتوقيت التطبيق بدون offset (للتقويم) */
export function wallClockIso(value: DateInput): string {
  return format(toAppTime(value), "yyyy-MM-dd'T'HH:mm:ss")
}

/** 'yyyy-MM-ddTHH:mm' لحقول datetime-local */
export function wallClockLocalInput(value: DateInput): string {
  return format(toAppTime(value), "yyyy-MM-dd'T'HH:mm")
}

/** 'HH:mm' و 'yyyy-MM-dd' مفصولين لحقول التاريخ والساعة */
export function splitWallClock(value: DateInput): { date: string; time: string } {
  return { date: dayKey(value), time: formatTime(value) }
}

/**
 * من نص بتوقيت التطبيق ('2026-10-20T10:00' أو '2026-10-20 10:00' أو '2026-10-20') للحظة الحقيقية.
 * بيرجع null إذا الصيغة غلط.
 */
export function fromWallClock(text: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(text.trim())
  if (!m) return null
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m
  const date = appDate(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
  return Number.isNaN(date.getTime()) ? null : date
}

/** يوم + ساعة (من حقلين) للحظة الحقيقية */
export function combineDateAndTime(date: string, time: string): Date | null {
  return fromWallClock(`${date}T${time}`)
}

/**
 * FullCalendar بيشتغل عنا بوضع UTC ومنطعمه أوقات "ساعة الحائط" بتوقيت القدس.
 * هاد بيحوّل لحظة حقيقية لتاريخ حقوله الـUTC هي الساعة المحلية.
 */
export function toCalendarUtcDate(value: DateInput): Date {
  const t = toAppTime(value)
  return new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), t.getMinutes(), t.getSeconds()))
}

/** العكس: تاريخ من FullCalendar (حقوله UTC = ساعة الحائط) للحظة الحقيقية */
export function fromCalendarUtcDate(d: Date): Date {
  return appDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), 0)
}

export function startOfDayApp(value: DateInput): Date {
  return new Date(startOfDay(toAppTime(value)).getTime())
}

/** بداية اليوم اللي بعده (نهاية حصرية) */
export function endOfDayApp(value: DateInput): Date {
  return addDaysApp(startOfDayApp(value), 1)
}

export function addDaysApp(value: DateInput, days: number): Date {
  return new Date(addDays(toAppTime(value), days).getTime())
}

/** الأسبوع بيبلّش يوم الأحد */
export function startOfWeekApp(value: DateInput): Date {
  return new Date(startOfWeek(toAppTime(value), { weekStartsOn: 0 }).getTime())
}

export function startOfMonthApp(value: DateInput): Date {
  return new Date(startOfMonth(toAppTime(value)).getTime())
}

export function addMonthsApp(value: DateInput, months: number): Date {
  return new Date(addMonths(toAppTime(value), months).getTime())
}

export function isSameDayApp(a: DateInput, b: DateInput): boolean {
  return dayKey(a) === dayKey(b)
}

/** تقريب لأقرب ربع ساعة لفوق (خطوات ربع ساعة بالنموذج) */
export function roundUpToQuarter(value: DateInput): Date {
  const t = toAppTime(value)
  const minutes = t.getMinutes()
  const rounded = Math.ceil(minutes / 15) * 15
  return appDate(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), rounded, 0)
}

/** "45 دقيقة"، "ساعة"، "ساعة ونص"، "ساعتين و15 دقيقة" */
export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const hourPart = h === 0 ? '' : h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : `${h} ساعات`
  const minutePart = m === 0 ? '' : m === 30 && h > 0 ? 'نص' : `${m} دقيقة`
  if (hourPart && minutePart) return `${hourPart} و${minutePart}`
  return hourPart || minutePart
}

/** "اليوم" / "بكرا" / "مبارح" / "الأحد 20/10" */
export function relativeDayLabel(value: DateInput, now: DateInput): string {
  const target = dayKey(value)
  if (target === dayKey(now)) return 'اليوم'
  if (target === dayKey(addDaysApp(now, 1))) return 'بكرا'
  if (target === dayKey(addDaysApp(now, -1))) return 'مبارح'
  return formatShortDayDate(value)
}

export function minutesBetween(from: DateInput, to: DateInput): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000)
}

/** "قبل 5 دقايق"، "قبل ساعتين"، "قبل 3 أيام" */
export function timeAgoLabel(value: DateInput, now: DateInput): string {
  const mins = Math.floor((new Date(now).getTime() - new Date(value).getTime()) / 60_000)
  if (mins < 1) return 'هلأ'
  if (mins < 60) return mins === 1 ? 'قبل دقيقة' : mins === 2 ? 'قبل دقيقتين' : `قبل ${mins} دقايق`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours === 1 ? 'قبل ساعة' : hours === 2 ? 'قبل ساعتين' : `قبل ${hours} ساعات`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'قبل يوم' : days === 2 ? 'قبل يومين' : days <= 10 ? `قبل ${days} أيام` : `قبل ${days} يوم`
}
