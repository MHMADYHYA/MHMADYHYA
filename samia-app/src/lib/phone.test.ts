import { describe, expect, it } from 'vitest'
import { formatPhoneForDisplay, normalizePhone } from './phone'

describe('normalizePhone', () => {
  it.each([
    ['0501234567', '972501234567'],
    ['050-123-4567', '972501234567'],
    ['+972501234567', '972501234567'],
    ['00972501234567', '972501234567'],
    ['972 50 123 4567', '972501234567'],
    ['  050 123 4567 ', '972501234567'],
    ['(050) 1234567', '972501234567'],
    ['٠٥٠١٢٣٤٥٦٧', '972501234567'],
    ['501234567', '972501234567'],
    ['04-8123456', '97248123456'],
    ['+970599123456', '970599123456'],
    ['+14155552671', '14155552671'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toEqual({ ok: true, phone: expected })
  })

  it.each(['', '   ', 'abc', '05012', '+972 50 12', '0501234567890', '05O1234567', '+0501234567'])(
    'رقم غلط: %s',
    (input) => {
      const result = normalizePhone(input)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toMatch(/[؀-ۿ]/)
    },
  )

  it('null بيرجع خطأ بدل ما يطيح', () => {
    expect(normalizePhone(null).ok).toBe(false)
    expect(normalizePhone(undefined).ok).toBe(false)
  })
})

describe('formatPhoneForDisplay', () => {
  it('رقم إسرائيلي بصيغة محلية مقروءة', () => {
    expect(formatPhoneForDisplay('972501234567')).toBe('050-123-4567')
  })
  it('رقم أجنبي مع +', () => {
    expect(formatPhoneForDisplay('14155552671')).toBe('+14155552671')
  })
  it('فاضي', () => {
    expect(formatPhoneForDisplay(null)).toBe('')
  })
})

describe('الخطوط الأرضية', () => {
  it('04-8123456 بيتعرض 04-812-3456', () => {
    expect(formatPhoneForDisplay('97248123456')).toBe('04-812-3456')
  })
})
