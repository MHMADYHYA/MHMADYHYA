/**
 * قواعد حالات الموعد (القسم 5 من الخطة) بمكان واحد.
 * نفس القواعد مطبّقة بقاعدة البيانات لصفحة الزبون (respond_to_appointment).
 */
import type { AppointmentStatus } from './database.types'

export type ClientAction = 'confirm' | 'change' | 'decline'

export const CLIENT_RESPONDABLE_STATUSES: readonly AppointmentStatus[] = [
  'pending',
  'confirmed',
  'declined',
  'change_requested',
]

export const CLIENT_ACTION_TARGET: Record<ClientAction, AppointmentStatus> = {
  confirm: 'confirmed',
  change: 'change_requested',
  decline: 'declined',
}

export const CLIENT_ACTION_LABELS: Record<ClientAction, string> = {
  confirm: 'موافق',
  change: 'بدي أغيّر',
  decline: 'ما بقدر أجي',
}

interface TimedAppointment {
  starts_at: string | Date
  ends_at?: string | Date
  status: AppointmentStatus
}

interface PayableAppointment extends TimedAppointment {
  payment_status: 'unpaid' | 'paid' | 'waived'
  price: number | null
}

function ms(value: string | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

/** الزبون بيقدر يرد لحد وقت بداية الموعد، وما بيقدر على ملغي أو مرق */
export function canClientRespond(status: AppointmentStatus, startsAt: string | Date, now: Date): boolean {
  return CLIENT_RESPONDABLE_STATUSES.includes(status) && ms(startsAt) > now.getTime()
}

/** الحالة اللي بيوصلها الموعد بعد رد الزبون */
export function clientResponseTarget(action: ClientAction): AppointmentStatus {
  return CLIENT_ACTION_TARGET[action]
}

/** الموعد بيحجز وقته بالتقويم (مش ملغي ولا مرفوض) */
export function occupiesSlot(status: AppointmentStatus): boolean {
  return status !== 'cancelled' && status !== 'declined'
}

/** وقت الموعد بلّش أو مرق */
export function hasStarted(a: TimedAppointment, now: Date): boolean {
  return ms(a.starts_at) <= now.getTime()
}

/** سامية بتقدر تعلّم حضر / ما حضر بعد وقت الموعد، إلا إذا ملغي */
export function canMarkAttendance(a: TimedAppointment, now: Date): boolean {
  return hasStarted(a, now) && a.status !== 'cancelled'
}

/** موعد مرق وقته وما انعلّم حضر أو ما حضر (بدها متابعة) */
export function needsAttendanceMark(a: TimedAppointment, now: Date): boolean {
  return hasStarted(a, now) && (a.status === 'pending' || a.status === 'confirmed' || a.status === 'change_requested')
}

export function canReschedule(a: TimedAppointment): boolean {
  return a.status !== 'cancelled'
}

export function canCancel(a: TimedAppointment): boolean {
  return a.status !== 'cancelled'
}

/** تغيير الوقت بيرجّع الحالة "بانتظار رد" */
export function statusAfterReschedule(status: AppointmentStatus): AppointmentStatus {
  if (status === 'cancelled') throw new Error('appointment_cancelled')
  return 'pending'
}

/** الدفع بيظهر بس للجلسات اللي حضرت أو ما حضرت */
export function showsPayment(a: { status: AppointmentStatus }): boolean {
  return a.status === 'attended' || a.status === 'no_show'
}

/** جلسة إلها سعر وما اندفعت (بتطلع بقائمة "ما اندفعت") */
export function isUnpaid(a: PayableAppointment): boolean {
  return showsPayment(a) && a.payment_status === 'unpaid' && (a.price ?? 0) > 0
}

/** حالة الرسائل: التذكيرات بتطلع بس إذا الموعد بانتظار رد أو موافق */
export function reminderApplies(status: AppointmentStatus): boolean {
  return status === 'pending' || status === 'confirmed'
}

export type AdminAction = 'reschedule' | 'cancel' | 'cancel_and_new' | 'set_status' | 'mark_attended' | 'mark_no_show'

/** الأزرار اللي بتظهر بصفحة الموعد حسب حالته ووقته */
export function availableAdminActions(a: TimedAppointment, now: Date): AdminAction[] {
  const actions: AdminAction[] = []
  if (canReschedule(a)) actions.push('reschedule')
  if (canCancel(a)) actions.push('cancel', 'cancel_and_new')
  if (canMarkAttendance(a, now)) actions.push('mark_attended', 'mark_no_show')
  actions.push('set_status')
  return actions
}
