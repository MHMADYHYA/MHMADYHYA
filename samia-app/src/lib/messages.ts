/**
 * تجهيز الرسائل (القسم 6 و7): أي رسائل بتنعمل مع كل حدث، ومتى لازم تنبعت.
 * النتيجة بتنبعت لدوال قاعدة البيانات كمصفوفة JSON وبتنحفظ بـ outbox_messages.
 */
import type { Json, MessageKind, MessageRecipient, SessionType } from './database.types'
import { formatDate, formatDayName, formatTime } from './dates'
import { fillTemplate, resolveTemplates, type TemplateKey, type TemplateVars } from './templates'

export interface OutboxDraft {
  recipient: MessageRecipient
  kind: MessageKind
  to_phone: string
  body: string
  due_at: string
}

export interface MessageSettings {
  templates: Json | Record<string, string>
  reminder_day_hours: number
  reminder_hour_minutes: number
  public_base_url: string | null
}

export interface MessageAppointment {
  starts_at: string | Date
  /** زوم (افتراضي) أو وجاهي */
  session_type?: SessionType
  meeting_url: string | null
  /** عنوان الجلسة الوجاهية */
  location?: string | null
  public_token: string
  has_companion: boolean
  companion_name: string | null
  companion_phone: string | null
  previous_starts_at?: string | Date | null
  cancel_reason?: string | null
}

export interface MessageClient {
  full_name: string
  phone: string
}

export type MessageEvent = 'invite' | 'change' | 'cancel'

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? ''
}

/**
 * رابط الرد: من إعدادات التطبيق، وإذا فاضية من رابط الصفحة الحالية (آخر حل).
 * رابط نسبي بدون موقع ما بينفتح من الواتساب.
 */
export function responseLink(baseUrl: string | null, token: string): string {
  let base = (baseUrl ?? '').trim().replace(/\/+$/, '')
  if (!base && typeof window !== 'undefined' && window.location?.origin) base = window.location.origin
  return `${base}/a/${token}`
}

export function buildTemplateVars(a: MessageAppointment, c: MessageClient, s: MessageSettings): TemplateVars {
  const previous = a.previous_starts_at ?? null
  const inPerson = a.session_type === 'in_person'
  return {
    الاسم: firstName(c.full_name),
    اسم_المرافق: a.has_companion ? (a.companion_name ?? '').trim() : '',
    اليوم: formatDayName(a.starts_at),
    التاريخ: formatDate(a.starts_at),
    الساعة: formatTime(a.starts_at),
    اليوم_القديم: previous ? formatDayName(previous) : '',
    التاريخ_القديم: previous ? formatDate(previous) : '',
    الساعة_القديمة: previous ? formatTime(previous) : '',
    // سطر الزوم للزوم بس، وسطر المكان للوجاهي بس (السطر الفاضي بينشال لحاله)
    رابط_الجلسة: inPerson ? '' : (a.meeting_url ?? ''),
    مكان_الجلسة: inPerson ? (a.location ?? '').trim() : '',
    رابط_الرد: responseLink(s.public_base_url, a.public_token),
    السبب: (a.cancel_reason ?? '').trim(),
  }
}

export function renderMessage(key: TemplateKey, vars: TemplateVars, templates: MessageSettings['templates']): string {
  return fillTemplate(resolveTemplates(templates)[key], vars)
}

/** أوقات التذكيرات */
export function reminderDueTimes(startsAt: string | Date, s: MessageSettings): { day: Date; hour: Date } {
  const start = new Date(startsAt).getTime()
  return {
    day: new Date(start - s.reminder_day_hours * 60 * 60_000),
    hour: new Date(start - s.reminder_hour_minutes * 60_000),
  }
}

/**
 * الرسائل اللي لازم تنعمل عند حدث معيّن:
 * - موعد جديد: دعوة (+ للمرافق) + تذكيرات اللي وقتها لسا ما إجا
 * - تغيير: رسالة تغيير (+ للمرافق) + تذكيرات جديدة
 * - إلغاء: رسالة إلغاء (+ للمرافق) بس
 */
export function buildMessages(
  event: MessageEvent,
  a: MessageAppointment,
  c: MessageClient,
  s: MessageSettings,
  now: Date,
): OutboxDraft[] {
  const vars = buildTemplateVars(a, c, s)
  const recipients: { recipient: MessageRecipient; phone: string }[] = [{ recipient: 'client', phone: c.phone }]
  if (a.has_companion && a.companion_phone) {
    recipients.push({ recipient: 'companion', phone: a.companion_phone })
  }

  const drafts: OutboxDraft[] = []
  const nowIso = now.toISOString()

  const push = (kind: MessageKind, dueAt: string) => {
    for (const r of recipients) {
      const body = renderMessage(`${kind}_${r.recipient}`, vars, s.templates)
      if (body.trim() === '') continue
      drafts.push({ recipient: r.recipient, kind, to_phone: r.phone, body, due_at: dueAt })
    }
  }

  push(event, nowIso)

  if (event !== 'cancel') {
    const due = reminderDueTimes(a.starts_at, s)
    if (due.day.getTime() > now.getTime()) push('reminder_day', due.day.toISOString())
    if (due.hour.getTime() > now.getTime()) push('reminder_hour', due.hour.toISOString())
  }

  return drafts
}

/** للمعاينة بالإعدادات: قيم تجريبية */
export function sampleTemplateVars(now: Date = new Date()): TemplateVars {
  const start = new Date(now.getTime() + 3 * 24 * 60 * 60_000)
  const previous = new Date(now.getTime() + 2 * 24 * 60 * 60_000)
  return {
    الاسم: 'ليلى',
    اسم_المرافق: 'أم ليلى',
    اليوم: formatDayName(start),
    التاريخ: formatDate(start),
    الساعة: '10:00',
    اليوم_القديم: formatDayName(previous),
    التاريخ_القديم: formatDate(previous),
    الساعة_القديمة: '16:00',
    رابط_الجلسة: 'https://zoom.us/j/1234567890',
    رابط_الرد: 'https://example.com/a/abc123',
    السبب: 'ظرف طارئ',
  }
}
