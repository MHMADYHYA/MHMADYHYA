/**
 * طبقة الوصول للبيانات: كل استعلام وتعديل بمكان واحد.
 * كل الدوال بترمي AppError برسالة عربية لما يصير خطأ.
 */
import type {
  AppointmentEventRow,
  AppointmentRow,
  AppointmentWithClient,
  ClientRow,
  Json,
  OutboxMessageRow,
  OutboxWithAppointment,
  PushSubscriptionRow,
  SettingsRow,
} from './database.types'
import { AppError, toArabicError } from './errors'
import type { OutboxDraft } from './messages'
import { requireSupabase } from './supabase'
import type { ClientAction } from './transitions'

const APPOINTMENT_WITH_CLIENT = '*, clients!inner(id, full_name, phone), outbox_messages(id, kind, recipient, due_at, sent_at, skipped_at)'

function fail(err: unknown, fallback?: string): never {
  throw new AppError(toArabicError(err, fallback), (err as { code?: string })?.code, err)
}

// -----------------------------------------------------------------------------
// الإعدادات
// -----------------------------------------------------------------------------
export async function fetchSettings(): Promise<SettingsRow> {
  const { data, error } = await requireSupabase().from('settings').select('*').eq('id', true).single()
  if (error) fail(error, 'ما قدرنا نقرأ الإعدادات')
  return data
}

export async function updateSettings(patch: Partial<SettingsRow>): Promise<SettingsRow> {
  const { data, error } = await requireSupabase().from('settings').update(patch).eq('id', true).select('*').single()
  if (error) fail(error, 'ما قدرنا نحفظ الإعدادات')
  return data
}

// -----------------------------------------------------------------------------
// الزبائن
// -----------------------------------------------------------------------------
export async function fetchClients(includeArchived = false): Promise<ClientRow[]> {
  let query = requireSupabase().from('clients').select('*').order('full_name')
  if (!includeArchived) query = query.eq('archived', false)
  const { data, error } = await query
  if (error) fail(error, 'ما قدرنا نقرأ الزبائن')
  return data
}

export async function fetchClient(id: string): Promise<ClientRow> {
  const { data, error } = await requireSupabase().from('clients').select('*').eq('id', id).single()
  if (error) fail(error, 'الزبون مش موجود')
  return data
}

export interface ClientInput {
  full_name: string
  phone: string
  default_companion_name?: string | null
  default_companion_phone?: string | null
  default_price?: number | null
  notes?: string | null
  archived?: boolean
}

export async function createClientRecord(input: ClientInput): Promise<ClientRow> {
  const { data, error } = await requireSupabase().from('clients').insert(input).select('*').single()
  if (error) fail(error, 'ما قدرنا نضيف الزبون')
  return data
}

export async function updateClientRecord(id: string, patch: Partial<ClientInput>): Promise<ClientRow> {
  const { data, error } = await requireSupabase().from('clients').update(patch).eq('id', id).select('*').single()
  if (error) fail(error, 'ما قدرنا نحفظ الزبون')
  return data
}

// -----------------------------------------------------------------------------
// المواعيد
// -----------------------------------------------------------------------------
export async function fetchAppointmentsInRange(start: Date, end: Date): Promise<AppointmentWithClient[]> {
  const { data, error } = await requireSupabase()
    .from('appointments')
    .select(APPOINTMENT_WITH_CLIENT)
    .gte('starts_at', start.toISOString())
    .lt('starts_at', end.toISOString())
    .order('starts_at')
  if (error) fail(error, 'ما قدرنا نقرأ المواعيد')
  return data as unknown as AppointmentWithClient[]
}

export async function fetchAppointmentsForClient(clientId: string): Promise<AppointmentWithClient[]> {
  const { data, error } = await requireSupabase()
    .from('appointments')
    .select(APPOINTMENT_WITH_CLIENT)
    .eq('client_id', clientId)
    .order('starts_at', { ascending: false })
  if (error) fail(error, 'ما قدرنا نقرأ مواعيد الزبون')
  return data as unknown as AppointmentWithClient[]
}

export async function fetchAppointment(id: string): Promise<AppointmentWithClient> {
  const { data, error } = await requireSupabase().from('appointments').select(APPOINTMENT_WITH_CLIENT).eq('id', id).single()
  if (error) fail(error, 'الموعد مش موجود')
  return data as unknown as AppointmentWithClient
}

export async function fetchAppointmentEvents(id: string): Promise<AppointmentEventRow[]> {
  const { data, error } = await requireSupabase()
    .from('appointment_events')
    .select('*')
    .eq('appointment_id', id)
    .order('created_at', { ascending: false })
  if (error) fail(error, 'ما قدرنا نقرأ سجل التغييرات')
  return data
}

export async function fetchAppointmentMessages(id: string): Promise<OutboxMessageRow[]> {
  const { data, error } = await requireSupabase()
    .from('outbox_messages')
    .select('*')
    .eq('appointment_id', id)
    .order('due_at')
  if (error) fail(error, 'ما قدرنا نقرأ الرسائل')
  return data
}

/** مواعيد بتتضارب مع فترة معيّنة (الملغية والمرفوضة ما بتنحسب) */
export async function findConflicts(start: Date, end: Date, excludeId?: string): Promise<AppointmentWithClient[]> {
  let query = requireSupabase()
    .from('appointments')
    .select(APPOINTMENT_WITH_CLIENT)
    .lt('starts_at', end.toISOString())
    .gt('ends_at', start.toISOString())
    .not('status', 'in', '("cancelled","declined")')
  if (excludeId) query = query.neq('id', excludeId)
  const { data, error } = await query
  if (error) fail(error, 'ما قدرنا نفحص التضارب')
  return data as unknown as AppointmentWithClient[]
}

export interface CreateAppointmentArgs {
  client_id: string
  starts_at: Date
  duration_min: number
  has_companion: boolean
  companion_name: string | null
  companion_phone: string | null
  meeting_url: string | null
  zoom_meeting_id: string | null
  price: number | null
  admin_notes: string | null
  public_token: string
  messages: OutboxDraft[]
}

export async function createAppointment(args: CreateAppointmentArgs): Promise<string> {
  const { data, error } = await requireSupabase().rpc('admin_create_appointment', {
    p_client_id: args.client_id,
    p_starts_at: args.starts_at.toISOString(),
    p_duration_min: args.duration_min,
    p_has_companion: args.has_companion,
    p_companion_name: args.companion_name,
    p_companion_phone: args.companion_phone,
    p_meeting_url: args.meeting_url,
    p_zoom_meeting_id: args.zoom_meeting_id,
    p_price: args.price,
    p_admin_notes: args.admin_notes,
    p_public_token: args.public_token,
    p_messages: args.messages as unknown as Json,
  })
  if (error) fail(error, 'ما قدرنا نحفظ الموعد')
  return data as string
}

export interface RescheduleArgs {
  id: string
  starts_at: Date
  duration_min: number
  meeting_url: string | null
  zoom_meeting_id: string | null
  messages: OutboxDraft[]
}

export async function rescheduleAppointment(args: RescheduleArgs): Promise<void> {
  const { error } = await requireSupabase().rpc('admin_reschedule_appointment', {
    p_id: args.id,
    p_starts_at: args.starts_at.toISOString(),
    p_duration_min: args.duration_min,
    p_meeting_url: args.meeting_url,
    p_zoom_meeting_id: args.zoom_meeting_id,
    p_messages: args.messages as unknown as Json,
  })
  if (error) fail(error, 'ما قدرنا نغيّر الموعد')
}

export async function cancelAppointment(id: string, reason: string | null, messages: OutboxDraft[]): Promise<void> {
  const { error } = await requireSupabase().rpc('admin_cancel_appointment', {
    p_id: id,
    p_reason: reason,
    p_messages: messages as unknown as Json,
  })
  if (error) fail(error, 'ما قدرنا نلغي الموعد')
}

export async function updateAppointment(id: string, patch: Partial<AppointmentRow>): Promise<AppointmentRow> {
  const { data, error } = await requireSupabase().from('appointments').update(patch).eq('id', id).select('*').single()
  if (error) fail(error, 'ما قدرنا نحفظ التغيير')
  return data
}

// -----------------------------------------------------------------------------
// الرسائل
// -----------------------------------------------------------------------------
const OUTBOX_WITH_APPOINTMENT = '*, appointments!inner(id, starts_at, status, companion_name, clients!inner(id, full_name))'

export interface OutboxData {
  pending: OutboxWithAppointment[]
  recent: OutboxWithAppointment[]
}

/** الرسائل غير المبعوتة اللي وقتها لحد نهاية اليوم، وآخر الرسائل المبعوتة */
export async function fetchOutbox(untilIso: string): Promise<OutboxData> {
  const sb = requireSupabase()
  const [pendingRes, recentRes] = await Promise.all([
    sb
      .from('outbox_messages')
      .select(OUTBOX_WITH_APPOINTMENT)
      .is('sent_at', null)
      .is('skipped_at', null)
      .lte('due_at', untilIso)
      .order('due_at'),
    sb
      .from('outbox_messages')
      .select(OUTBOX_WITH_APPOINTMENT)
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(20),
  ])
  if (pendingRes.error) fail(pendingRes.error, 'ما قدرنا نقرأ الرسائل')
  if (recentRes.error) fail(recentRes.error, 'ما قدرنا نقرأ الرسائل')
  return {
    pending: pendingRes.data as unknown as OutboxWithAppointment[],
    recent: recentRes.data as unknown as OutboxWithAppointment[],
  }
}

export async function updateMessage(id: string, patch: Partial<OutboxMessageRow>): Promise<void> {
  const { error } = await requireSupabase().from('outbox_messages').update(patch).eq('id', id)
  if (error) fail(error, 'ما قدرنا نحدّث الرسالة')
}

// -----------------------------------------------------------------------------
// المتابعة والدفعات
// -----------------------------------------------------------------------------
export type FollowUpSource = AppointmentWithClient & {
  outbox_messages: Pick<OutboxMessageRow, 'kind' | 'recipient' | 'sent_at'>[]
}

/** البيانات اللازمة لصفحة "بدها متابعة": مواعيد من آخر 60 يوم ولقدام */
export async function fetchFollowUpSource(now: Date): Promise<FollowUpSource[]> {
  const since = new Date(now.getTime() - 60 * 24 * 60 * 60_000).toISOString()
  const { data, error } = await requireSupabase()
    .from('appointments')
    .select('*, clients!inner(id, full_name, phone), outbox_messages(kind, recipient, sent_at)')
    .gte('starts_at', since)
    .in('status', ['pending', 'confirmed', 'declined', 'change_requested'])
    .order('starts_at')
  if (error) fail(error, 'ما قدرنا نقرأ المتابعة')
  return data as unknown as FollowUpSource[]
}

/** جلسات حضرت أو ما حضرت (للدفعات) من تاريخ معيّن */
export async function fetchPayable(since: Date): Promise<AppointmentWithClient[]> {
  const { data, error } = await requireSupabase()
    .from('appointments')
    .select(APPOINTMENT_WITH_CLIENT)
    .gte('starts_at', since.toISOString())
    .in('status', ['attended', 'no_show'])
    .order('starts_at')
  if (error) fail(error, 'ما قدرنا نقرأ الدفعات')
  return data as unknown as AppointmentWithClient[]
}

export async function fetchAllAppointmentsForExport(): Promise<AppointmentWithClient[]> {
  const { data, error } = await requireSupabase().from('appointments').select(APPOINTMENT_WITH_CLIENT).order('starts_at')
  if (error) fail(error, 'ما قدرنا نصدّر المواعيد')
  return data as unknown as AppointmentWithClient[]
}

// -----------------------------------------------------------------------------
// التنبيهات
// -----------------------------------------------------------------------------
export async function fetchPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  const { data, error } = await requireSupabase().from('push_subscriptions').select('*').order('created_at')
  if (error) fail(error, 'ما قدرنا نقرأ اشتراكات التنبيهات')
  return data
}

export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }): Promise<void> {
  const { error } = await requireSupabase().from('push_subscriptions').upsert(sub, { onConflict: 'endpoint' })
  if (error) fail(error, 'ما قدرنا نحفظ اشتراك التنبيهات')
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const { error } = await requireSupabase().from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) fail(error, 'ما قدرنا نلغي اشتراك التنبيهات')
}

// -----------------------------------------------------------------------------
// صفحة الزبون العامة
// -----------------------------------------------------------------------------
export interface PublicAppointment {
  first_name: string
  starts_at: string
  duration_min: number
  status: AppointmentRow['status']
  meeting_url: string | null
  can_respond: boolean
}

export async function getPublicAppointment(token: string): Promise<PublicAppointment | null> {
  const { data, error } = await requireSupabase().rpc('get_public_appointment', { p_token: token })
  if (error) fail(error, 'ما قدرنا نفتح الرابط')
  return (data as unknown as PublicAppointment | null) ?? null
}

export type RespondResult =
  | ({ ok: true } & PublicAppointment)
  | { ok: false; error: 'invalid_action' | 'not_found' | 'cancelled' | 'expired' | 'not_allowed' }

export async function respondToAppointment(token: string, action: ClientAction, note: string | null): Promise<RespondResult> {
  const { data, error } = await requireSupabase().rpc('respond_to_appointment', {
    p_token: token,
    p_action: action,
    p_note: note,
  })
  if (error) fail(error, 'ما قدرنا نسجّل ردك')
  return data as unknown as RespondResult
}

// -----------------------------------------------------------------------------
// الزوم (Edge Function)
// -----------------------------------------------------------------------------
export type ZoomAction = 'status' | 'test' | 'create' | 'update' | 'delete'

export interface ZoomResult {
  ok: boolean
  configured: boolean
  message?: string
  meeting?: { id: string; join_url: string }
}

export async function invokeZoom(action: ZoomAction, payload: Record<string, unknown> = {}): Promise<ZoomResult> {
  const { data, error } = await requireSupabase().functions.invoke<ZoomResult>('zoom-meeting', {
    body: { action, ...payload },
  })
  if (error) {
    return { ok: false, configured: false, message: toArabicError(error, 'ما قدرنا نوصل لخدمة الزوم') }
  }
  return data ?? { ok: false, configured: false, message: 'رد فاضي من خدمة الزوم' }
}
