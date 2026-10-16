/** حسابات الدفع (القسم 5 و12): ملخص الشهر وقائمة "ما اندفعت" */
import type { AppointmentStatus, PaymentStatus } from './database.types'
import { addMonthsApp, startOfMonthApp } from './dates'
import { isUnpaid } from './transitions'

export interface PayableAppointment {
  starts_at: string
  status: AppointmentStatus
  payment_status: PaymentStatus
  price: number | null
}

export interface MonthSummary {
  received: number
  receivedCount: number
  outstanding: number
  outstandingCount: number
}

function inMonth(startsAt: string, monthStart: Date, monthEnd: Date): boolean {
  const t = new Date(startsAt).getTime()
  return t >= monthStart.getTime() && t < monthEnd.getTime()
}

/** ملخص شهر معيّن حسب تاريخ الجلسة: "وصل" و"لسا ما اندفع" */
export function monthSummary<T extends PayableAppointment>(appointments: T[], anyDayInMonth: Date): MonthSummary {
  const monthStart = startOfMonthApp(anyDayInMonth)
  const monthEnd = addMonthsApp(monthStart, 1)
  const summary: MonthSummary = { received: 0, receivedCount: 0, outstanding: 0, outstandingCount: 0 }
  for (const a of appointments) {
    if (!inMonth(a.starts_at, monthStart, monthEnd)) continue
    if (a.payment_status === 'paid' && (a.price ?? 0) > 0) {
      summary.received += Number(a.price)
      summary.receivedCount += 1
    } else if (isUnpaid(a)) {
      summary.outstanding += Number(a.price)
      summary.outstandingCount += 1
    }
  }
  return summary
}

/** الجلسات اللي ما اندفعت، من الأقدم */
export function unpaidAppointments<T extends PayableAppointment>(appointments: T[]): T[] {
  return appointments
    .filter((a) => isUnpaid(a))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
}

/** مجموع اللي لسا ما اندفع (مثلاً لصفحة الزبون) */
export function outstandingTotal(appointments: PayableAppointment[]): number {
  return unpaidAppointments(appointments).reduce((sum, a) => sum + Number(a.price ?? 0), 0)
}

/** "200 ₪" أو "150.50 ₪" */
export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—'
  const n = Number(amount)
  const text = Number.isInteger(n) ? String(n) : n.toFixed(2)
  return `${text} ₪`
}
