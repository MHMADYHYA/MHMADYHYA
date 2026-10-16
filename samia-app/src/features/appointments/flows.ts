/**
 * سير العمل المركّب للمواعيد: فحص تضارب ← زوم ← تجهيز الرسائل ← حفظ ذرّي.
 * الصفحات بتنادي هاي الدوال من useMutation.
 */
import {
  cancelAppointment,
  createAppointment,
  createClientRecord,
  findConflicts,
  invokeZoom,
  rescheduleAppointment,
} from '../../lib/api'
import type { AppointmentWithClient, ClientRow, SettingsRow } from '../../lib/database.types'
import { formatTime, wallClockIso } from '../../lib/dates'
import { AppError, isConflictError } from '../../lib/errors'
import { buildMessages } from '../../lib/messages'
import { normalizePhone } from '../../lib/phone'
import { generatePublicToken } from '../../lib/tokens'

export interface MeetingInfo {
  meeting_url: string | null
  zoom_meeting_id: string | null
  /** تنبيه لسامية إذا الزوم ما اشتغل */
  warning: string | null
}

export function conflictMessage(conflicts: { clients: { full_name: string }; starts_at: string }[]): string {
  const first = conflicts[0]
  return `في موعد ثاني بنفس الوقت: ${first.clients.full_name} ${formatTime(first.starts_at)}`
}

export async function assertNoConflict(start: Date, end: Date, excludeId?: string): Promise<void> {
  const conflicts = await findConflicts(start, end, excludeId)
  if (conflicts.length > 0) throw new AppError(conflictMessage(conflicts), 'conflict')
}

/** إنشاء اجتماع زوم، وإذا ما زبط: الرابط الثابت من الإعدادات */
export async function createMeeting(start: Date, durationMin: number, settings: SettingsRow): Promise<MeetingInfo> {
  const fallback = settings.fixed_meeting_url?.trim() || null
  try {
    const result = await invokeZoom('create', {
      start_time: wallClockIso(start),
      duration: durationMin,
      timezone: settings.timezone,
    })
    if (result.ok && result.meeting) {
      return { meeting_url: result.meeting.join_url, zoom_meeting_id: result.meeting.id, warning: null }
    }
    if (!result.configured) {
      return {
        meeting_url: fallback,
        zoom_meeting_id: null,
        warning: fallback ? 'الزوم مش مربوط، استعملنا الرابط الثابت.' : 'الزوم مش مربوط وما في رابط ثابت. الرسالة رح تطلع بدون رابط جلسة.',
      }
    }
    return {
      meeting_url: fallback,
      zoom_meeting_id: null,
      warning: `ما قدرنا نعمل رابط زوم (${result.message ?? 'خطأ'}). ${fallback ? 'استعملنا الرابط الثابت.' : 'الرسالة بدون رابط جلسة.'}`,
    }
  } catch {
    return { meeting_url: fallback, zoom_meeting_id: null, warning: 'ما قدرنا نوصل لخدمة الزوم. ' + (fallback ? 'استعملنا الرابط الثابت.' : 'الرسالة بدون رابط جلسة.') }
  }
}

export async function updateMeeting(a: AppointmentWithClient, start: Date, durationMin: number, settings: SettingsRow): Promise<MeetingInfo> {
  if (!a.zoom_meeting_id) {
    // ما في اجتماع زوم سابق: نحاول نعمل واحد جديد
    return createMeeting(start, durationMin, settings)
  }
  try {
    const result = await invokeZoom('update', {
      meeting_id: a.zoom_meeting_id,
      start_time: wallClockIso(start),
      duration: durationMin,
      timezone: settings.timezone,
    })
    if (result.ok) return { meeting_url: a.meeting_url, zoom_meeting_id: a.zoom_meeting_id, warning: null }
    return { meeting_url: a.meeting_url, zoom_meeting_id: a.zoom_meeting_id, warning: `ما قدرنا نعدّل اجتماع الزوم (${result.message ?? 'خطأ'}). الرابط القديم بيضل شغال.` }
  } catch {
    return { meeting_url: a.meeting_url, zoom_meeting_id: a.zoom_meeting_id, warning: 'ما قدرنا نوصل لخدمة الزوم. الرابط القديم بيضل شغال.' }
  }
}

export async function deleteMeeting(a: AppointmentWithClient): Promise<string | null> {
  if (!a.zoom_meeting_id) return null
  try {
    const result = await invokeZoom('delete', { meeting_id: a.zoom_meeting_id })
    return result.ok ? null : `ما قدرنا نحذف اجتماع الزوم (${result.message ?? 'خطأ'}).`
  } catch {
    return 'ما قدرنا نوصل لخدمة الزوم لحذف الاجتماع.'
  }
}

export interface NewAppointmentInput {
  client: { mode: 'existing'; id: string } | { mode: 'new'; full_name: string; phone: string }
  starts_at: Date
  duration_min: number
  has_companion: boolean
  companion_name: string
  companion_phone: string
  price: number | null
  admin_notes: string
}

export interface FlowResult {
  id: string
  warning: string | null
}

export async function createAppointmentFlow(
  input: NewAppointmentInput,
  settings: SettingsRow,
  clients: ClientRow[],
  now: Date,
): Promise<FlowResult> {
  // 1) الزبون
  let client: ClientRow
  if (input.client.mode === 'new') {
    const phone = normalizePhone(input.client.phone)
    if (!phone.ok) throw new AppError(phone.error)
    const name = input.client.full_name.trim()
    if (!name) throw new AppError('اكتب اسم الزبون')
    client = await createClientRecord({ full_name: name, phone: phone.phone })
  } else {
    const found = clients.find((c) => c.id === (input.client as { id: string }).id)
    if (!found) throw new AppError('اختار زبون')
    client = found
  }

  // 2) المرافق
  let companionPhone: string | null = null
  let companionName: string | null = null
  if (input.has_companion) {
    const phone = normalizePhone(input.companion_phone)
    if (!phone.ok) throw new AppError(`رقم المرافق: ${phone.error}`)
    if (!input.companion_name.trim()) throw new AppError('اكتب اسم المرافق')
    companionPhone = phone.phone
    companionName = input.companion_name.trim()
  }

  // 3) التضارب
  const end = new Date(input.starts_at.getTime() + input.duration_min * 60_000)
  await assertNoConflict(input.starts_at, end)

  // 4) الزوم
  const meeting = await createMeeting(input.starts_at, input.duration_min, settings)

  // 5) الرسائل والحفظ
  const public_token = generatePublicToken()
  const messages = buildMessages(
    'invite',
    {
      starts_at: input.starts_at,
      meeting_url: meeting.meeting_url,
      public_token,
      has_companion: input.has_companion,
      companion_name: companionName,
      companion_phone: companionPhone,
    },
    client,
    settings,
    now,
  )

  try {
    const id = await createAppointment({
      client_id: client.id,
      starts_at: input.starts_at,
      duration_min: input.duration_min,
      has_companion: input.has_companion,
      companion_name: companionName,
      companion_phone: companionPhone,
      meeting_url: meeting.meeting_url,
      zoom_meeting_id: meeting.zoom_meeting_id,
      price: input.price,
      admin_notes: input.admin_notes.trim() || null,
      public_token,
      messages,
    })
    return { id, warning: meeting.warning }
  } catch (err) {
    if (isConflictError((err as AppError).cause ?? err)) {
      const conflicts = await findConflicts(input.starts_at, end)
      throw new AppError(conflicts.length ? conflictMessage(conflicts) : 'في موعد ثاني بنفس الوقت.')
    }
    throw err
  }
}

export async function rescheduleFlow(
  a: AppointmentWithClient,
  starts_at: Date,
  duration_min: number,
  settings: SettingsRow,
  now: Date,
): Promise<FlowResult> {
  const end = new Date(starts_at.getTime() + duration_min * 60_000)
  await assertNoConflict(starts_at, end, a.id)
  const meeting = await updateMeeting(a, starts_at, duration_min, settings)
  const messages = buildMessages(
    'change',
    {
      starts_at,
      meeting_url: meeting.meeting_url,
      public_token: a.public_token,
      has_companion: a.has_companion,
      companion_name: a.companion_name,
      companion_phone: a.companion_phone,
      previous_starts_at: a.starts_at,
    },
    a.clients,
    settings,
    now,
  )
  try {
    await rescheduleAppointment({
      id: a.id,
      starts_at,
      duration_min,
      meeting_url: meeting.meeting_url,
      zoom_meeting_id: meeting.zoom_meeting_id,
      messages,
    })
  } catch (err) {
    if (isConflictError((err as AppError).cause ?? err)) {
      const conflicts = await findConflicts(starts_at, end, a.id)
      throw new AppError(conflicts.length ? conflictMessage(conflicts) : 'في موعد ثاني بنفس الوقت.')
    }
    throw err
  }
  return { id: a.id, warning: meeting.warning }
}

export async function cancelFlow(
  a: AppointmentWithClient,
  reason: string,
  settings: SettingsRow,
  now: Date,
): Promise<FlowResult> {
  const zoomWarning = await deleteMeeting(a)
  const cancel_reason = reason.trim() || null
  const messages = buildMessages(
    'cancel',
    {
      starts_at: a.starts_at,
      meeting_url: a.meeting_url,
      public_token: a.public_token,
      has_companion: a.has_companion,
      companion_name: a.companion_name,
      companion_phone: a.companion_phone,
      cancel_reason,
    },
    a.clients,
    settings,
    now,
  )
  await cancelAppointment(a.id, cancel_reason, messages)
  return { id: a.id, warning: zoomWarning }
}
