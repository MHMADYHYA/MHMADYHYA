import { describe, expect, it } from 'vitest'
import { APPOINTMENT_STATUSES, STATUS_LABELS } from './status'

describe('حالات الموعد', () => {
  it('كل حالة إلها اسم عربي بالواجهة', () => {
    for (const status of APPOINTMENT_STATUSES) {
      expect(STATUS_LABELS[status]).toMatch(/[؀-ۿ]/)
    }
  })

  it('السبع حالات من الخطة موجودة', () => {
    expect(APPOINTMENT_STATUSES).toEqual([
      'pending',
      'confirmed',
      'declined',
      'change_requested',
      'cancelled',
      'attended',
      'no_show',
    ])
  })
})
