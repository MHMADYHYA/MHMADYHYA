import { describe, expect, it } from 'vitest'
import { formatMoney, monthSummary, outstandingTotal, unpaidAppointments } from './payments'

const list = [
  { starts_at: '2026-10-05T07:00:00Z', status: 'attended', payment_status: 'paid', price: 200 },
  { starts_at: '2026-10-12T07:00:00Z', status: 'attended', payment_status: 'unpaid', price: 200 },
  { starts_at: '2026-10-19T07:00:00Z', status: 'no_show', payment_status: 'unpaid', price: 150 },
  { starts_at: '2026-10-26T07:00:00Z', status: 'attended', payment_status: 'waived', price: 200 },
  { starts_at: '2026-10-31T22:30:00Z', status: 'attended', payment_status: 'paid', price: 300 }, // 1/11 بتوقيت القدس (شتوي UTC+2)
  { starts_at: '2026-09-30T20:00:00Z', status: 'attended', payment_status: 'unpaid', price: 100 }, // 30/9 بتوقيت القدس (23:00)
  { starts_at: '2026-10-20T07:00:00Z', status: 'confirmed', payment_status: 'unpaid', price: 200 },
] as const

describe('ملخص الشهر', () => {
  it('بيحسب وصل / لسا ما اندفع حسب تاريخ الجلسة بتوقيت القدس', () => {
    const s = monthSummary([...list], new Date('2026-10-15T00:00:00Z'))
    expect(s).toEqual({ received: 200, receivedCount: 1, outstanding: 350, outstandingCount: 2 })
  })

  it('الشهر اللي بعده بياخد جلسة 1/11', () => {
    const s = monthSummary([...list], new Date('2026-11-10T00:00:00Z'))
    expect(s.received).toBe(300)
    expect(s.outstanding).toBe(0)
  })

  it('الشهر اللي قبله', () => {
    const s = monthSummary([...list], new Date('2026-09-10T00:00:00Z'))
    expect(s.outstanding).toBe(100)
  })
})

describe('قائمة ما اندفعت', () => {
  it('من الأقدم للأحدث، وبس حضر / ما حضر', () => {
    const unpaid = unpaidAppointments([...list])
    expect(unpaid.map((a) => a.starts_at)).toEqual([
      '2026-09-30T20:00:00Z',
      '2026-10-12T07:00:00Z',
      '2026-10-19T07:00:00Z',
    ])
    expect(outstandingTotal([...list])).toBe(450)
  })
})

describe('formatMoney', () => {
  it('بدون كسور لما صحيح', () => {
    expect(formatMoney(200)).toBe('200 ₪')
    expect(formatMoney(150.5)).toBe('150.50 ₪')
    expect(formatMoney(null)).toBe('—')
  })
})
