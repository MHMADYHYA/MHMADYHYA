import { describe, expect, it } from 'vitest'
import { formatDate, formatDayAndDate, formatDayName, formatTime, greetingFor } from './dates'

describe('تنسيق التاريخ والوقت بتوقيت القدس', () => {
  it('بالتوقيت الصيفي (UTC+3)', () => {
    const d = new Date('2026-10-20T07:00:00Z')
    expect(formatDayName(d)).toBe('الثلاثاء')
    expect(formatDate(d)).toBe('20/10/2026')
    expect(formatTime(d)).toBe('10:00')
    expect(formatDayAndDate(d)).toBe('الثلاثاء 20/10/2026')
  })

  it('بالتوقيت الشتوي (UTC+2)', () => {
    const d = new Date('2026-12-15T07:00:00Z')
    expect(formatTime(d)).toBe('09:00')
    expect(formatDayName(d)).toBe('الثلاثاء')
    expect(formatDate(d)).toBe('15/12/2026')
  })

  it('اليوم بيتغيّر عند منتصف الليل بتوقيت القدس مش UTC', () => {
    const d = new Date('2026-10-20T22:30:00Z')
    expect(formatDate(d)).toBe('21/10/2026')
    expect(formatDayName(d)).toBe('الأربعاء')
    expect(formatTime(d)).toBe('01:30')
  })

  it('بيقبل نص ISO ورقم', () => {
    expect(formatTime('2026-10-20T07:00:00Z')).toBe('10:00')
    expect(formatTime(Date.parse('2026-10-20T07:00:00Z'))).toBe('10:00')
  })
})

describe('التحية حسب الوقت', () => {
  it('صباح الخير قبل 12 الظهر', () => {
    expect(greetingFor(new Date('2026-10-20T05:00:00Z'))).toBe('صباح الخير، سامية')
    expect(greetingFor(new Date('2026-10-20T08:30:00Z'))).toBe('صباح الخير، سامية')
  })

  it('مسا الخير من 12 الظهر', () => {
    expect(greetingFor(new Date('2026-10-20T09:00:00Z'))).toBe('مسا الخير، سامية')
    expect(greetingFor(new Date('2026-10-20T18:00:00Z'))).toBe('مسا الخير، سامية')
  })

  it('بيقبل اسم مختلف', () => {
    expect(greetingFor(new Date('2026-10-20T05:00:00Z'), 'ليلى')).toBe('صباح الخير، ليلى')
  })
})
