import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'

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

type DateInput = Date | string | number

/** تحويل أي تاريخ لتاريخ بتوقيت التطبيق */
export function toAppTime(value: DateInput): TZDate {
  const date = value instanceof Date ? value : new Date(value)
  return new TZDate(date, APP_TIMEZONE)
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

/** تحية حسب الوقت بتوقيت القدس */
export function greetingFor(value: DateInput, name = 'سامية'): string {
  const hour = toAppTime(value).getHours()
  const greeting = hour < 12 ? 'صباح الخير' : 'مسا الخير'
  return `${greeting}، ${name}`
}
