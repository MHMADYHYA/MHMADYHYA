/** حالات الموعد (القسم 5 من الخطة). المنطق الكامل للانتقالات بيجي بالمرحلة 1 و2. */
export const APPOINTMENT_STATUSES = [
  'pending',
  'confirmed',
  'declined',
  'change_requested',
  'cancelled',
  'attended',
  'no_show',
] as const

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

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
