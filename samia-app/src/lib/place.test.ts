import { describe, expect, it } from 'vitest'
import { mapsUrl, resolvePlace, SESSION_TYPE_LABELS } from './place'

describe('نوع الجلسة ومكانها', () => {
  it('الزوم ما إله عنوان، والافتراضي زوم', () => {
    expect(resolvePlace('zoom', 'شارع')).toEqual({ session_type: 'zoom', location: null })
    expect(resolvePlace(undefined, null)).toEqual({ session_type: 'zoom', location: null })
  })

  it('الوجاهي لازم يكون إله عنوان', () => {
    expect(resolvePlace('in_person', '  العيادة  ')).toEqual({ session_type: 'in_person', location: 'العيادة' })
    expect(() => resolvePlace('in_person', '   ')).toThrow(/عنوان الجلسة الوجاهية/)
    expect(() => resolvePlace('in_person', null)).toThrow(/عنوان الجلسة الوجاهية/)
  })

  it('رابط الخريطة والأسماء', () => {
    expect(mapsUrl(' شارع الجليل 12 ')).toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('شارع الجليل 12')}`)
    expect(SESSION_TYPE_LABELS).toEqual({ zoom: 'زوم', in_person: 'وجاهي' })
  })
})
