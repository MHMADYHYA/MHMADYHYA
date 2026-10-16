import type { AppointmentStatus, PaymentMethod, PaymentStatus } from './database.types'

export type { AppointmentStatus, PaymentMethod, PaymentStatus }

/** حالات الموعد (القسم 5 من الخطة) */
export const APPOINTMENT_STATUSES = [
  'pending',
  'confirmed',
  'declined',
  'change_requested',
  'cancelled',
  'attended',
  'no_show',
] as const satisfies readonly AppointmentStatus[]

/** الاسم اللي بيظهر بالواجهة لكل حالة */
export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'بانتظار رد',
  confirmed: 'موافق',
  declined: 'رافض',
  change_requested: 'طلب تغيير',
  cancelled: 'ملغي',
  attended: 'حضر',
  no_show: 'ما حضر',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'ما اندفع',
  paid: 'دفع',
  waived: 'بدون دفع',
}

export const PAYMENT_METHODS = ['cash', 'bit', 'transfer', 'other'] as const satisfies readonly PaymentMethod[]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'نقدي',
  bit: 'بيت',
  transfer: 'تحويل بنكي',
  other: 'غيره',
}

export const MESSAGE_KIND_LABELS = {
  invite: 'دعوة',
  change: 'تغيير موعد',
  cancel: 'إلغاء',
  reminder_day: 'تذكير قبل بيوم',
  reminder_hour: 'تذكير قبل بساعة',
} as const

export const RECIPIENT_LABELS = {
  client: 'الزبون',
  companion: 'المرافق',
} as const

export const EVENT_TYPE_LABELS: Record<string, string> = {
  created: 'تم تعيين الموعد',
  status_changed: 'تغيّرت الحالة',
  rescheduled: 'تغيّر الوقت',
  cancelled: 'تم الإلغاء',
  message_sent: 'انبعتت رسالة',
  payment_changed: 'تغيّر الدفع',
  slot_taken: 'الزبون حاول يوافق بس الوقت كان محجوز',
}

export const ACTOR_LABELS: Record<string, string> = {
  admin: 'سامية',
  client: 'الزبون',
  system: 'النظام',
}
