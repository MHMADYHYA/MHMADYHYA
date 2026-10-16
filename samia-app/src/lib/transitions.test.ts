import { describe, expect, it } from 'vitest'
import type { AppointmentStatus } from './database.types'
import { APPOINTMENT_STATUSES } from './status'
import {
  availableAdminActions,
  canClientRespond,
  canMarkAttendance,
  clientResponseTarget,
  isUnpaid,
  needsAttendanceMark,
  occupiesSlot,
  reminderApplies,
  showsPayment,
  statusAfterReschedule,
} from './transitions'

const now = new Date('2026-10-20T07:00:00Z')
const future = '2026-10-21T07:00:00Z'
const past = '2026-10-19T07:00:00Z'

describe('رد الزبون', () => {
  it('بيقدر يرد من pending/confirmed/declined/change_requested لحد وقت الموعد', () => {
    for (const s of ['pending', 'confirmed', 'declined', 'change_requested'] as AppointmentStatus[]) {
      expect(canClientRespond(s, future, now)).toBe(true)
      expect(canClientRespond(s, past, now)).toBe(false)
    }
  })

  it('ما بيقدر يرد على ملغي أو حضر أو ما حضر', () => {
    for (const s of ['cancelled', 'attended', 'no_show'] as AppointmentStatus[]) {
      expect(canClientRespond(s, future, now)).toBe(false)
    }
  })

  it('وقت البداية بالضبط = ما بيقدر', () => {
    expect(canClientRespond('pending', now, now)).toBe(false)
  })

  it('كل إجراء بيوصل لحالة', () => {
    expect(clientResponseTarget('confirm')).toBe('confirmed')
    expect(clientResponseTarget('change')).toBe('change_requested')
    expect(clientResponseTarget('decline')).toBe('declined')
  })
})

describe('قواعد سامية', () => {
  it('الملغي والمرفوض ما بيحجزوا وقت', () => {
    expect(APPOINTMENT_STATUSES.filter(occupiesSlot)).toEqual([
      'pending',
      'confirmed',
      'change_requested',
      'attended',
      'no_show',
    ])
  })

  it('تغيير الوقت بيرجّع بانتظار رد، وممنوع على الملغي', () => {
    expect(statusAfterReschedule('confirmed')).toBe('pending')
    expect(statusAfterReschedule('declined')).toBe('pending')
    expect(() => statusAfterReschedule('cancelled')).toThrow()
    expect(() => statusAfterReschedule('attended')).toThrow()
    expect(() => statusAfterReschedule('no_show')).toThrow()
  })

  it('حضر / ما حضر بس بعد وقت الموعد ومش ملغي', () => {
    expect(canMarkAttendance({ starts_at: past, status: 'confirmed' }, now)).toBe(true)
    expect(canMarkAttendance({ starts_at: future, status: 'confirmed' }, now)).toBe(false)
    expect(canMarkAttendance({ starts_at: past, status: 'cancelled' }, now)).toBe(false)
  })

  it('بدها متابعة: مرق وقته وما انعلّم', () => {
    expect(needsAttendanceMark({ starts_at: past, status: 'confirmed' }, now)).toBe(true)
    expect(needsAttendanceMark({ starts_at: past, status: 'attended' }, now)).toBe(false)
    expect(needsAttendanceMark({ starts_at: past, status: 'declined' }, now)).toBe(false)
    expect(needsAttendanceMark({ starts_at: future, status: 'pending' }, now)).toBe(false)
  })

  it('الأزرار المتاحة', () => {
    expect(availableAdminActions({ starts_at: future, status: 'pending' }, now)).toEqual([
      'reschedule',
      'cancel',
      'cancel_and_new',
      'set_status',
    ])
    expect(availableAdminActions({ starts_at: past, status: 'confirmed' }, now)).toEqual([
      'reschedule',
      'cancel',
      'cancel_and_new',
      'mark_attended',
      'mark_no_show',
      'set_status',
    ])
    expect(availableAdminActions({ starts_at: past, status: 'cancelled' }, now)).toEqual(['set_status'])
    expect(availableAdminActions({ starts_at: past, status: 'attended' }, now)).toEqual([
      'cancel',
      'cancel_and_new',
      'mark_attended',
      'mark_no_show',
      'set_status',
    ])
  })

  it('التذكيرات بس لـ pending وconfirmed', () => {
    expect(APPOINTMENT_STATUSES.filter(reminderApplies)).toEqual(['pending', 'confirmed'])
  })
})

describe('الدفع', () => {
  it('بيظهر بس لحضر / ما حضر', () => {
    expect(APPOINTMENT_STATUSES.filter((status) => showsPayment({ status }))).toEqual(['attended', 'no_show'])
  })

  it('ما اندفعت = حضر أو ما حضر + unpaid + سعر أكبر من صفر', () => {
    const base = { starts_at: past, status: 'attended' as const, payment_status: 'unpaid' as const, price: 200 }
    expect(isUnpaid(base)).toBe(true)
    expect(isUnpaid({ ...base, status: 'no_show' })).toBe(true)
    expect(isUnpaid({ ...base, status: 'confirmed' })).toBe(false)
    expect(isUnpaid({ ...base, payment_status: 'paid' })).toBe(false)
    expect(isUnpaid({ ...base, payment_status: 'waived' })).toBe(false)
    expect(isUnpaid({ ...base, price: 0 })).toBe(false)
    expect(isUnpaid({ ...base, price: null })).toBe(false)
  })
})
