import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TEMPLATES,
  TEMPLATE_KEYS,
  TEMPLATE_VARIABLES,
  fillTemplate,
  resolveTemplates,
  templateVariablesIn,
} from './templates'

describe('fillTemplate', () => {
  it('بيستبدل المتغيرات', () => {
    expect(fillTemplate('مرحبا {الاسم}، جلستك الساعة {الساعة}', { الاسم: 'ليلى', الساعة: '10:00' })).toBe(
      'مرحبا ليلى، جلستك الساعة 10:00',
    )
  })

  it('سطر فيه متغير فاضي بينشال كامل', () => {
    const result = fillTemplate(DEFAULT_TEMPLATES.cancel_client, {
      الاسم: 'ليلى',
      اليوم: 'الثلاثاء',
      التاريخ: '20/10/2026',
      الساعة: '10:00',
      السبب: '',
    })
    expect(result).toBe('مرحبا ليلى،\nبنعلمك إنو الجلسة يوم الثلاثاء 20/10/2026 الساعة 10:00 انلغت.\nسامية يحيى')
  })

  it('السطر بيضل لما المتغير معبّى', () => {
    const result = fillTemplate('{السبب}\nسامية', { السبب: 'ظرف طارئ' })
    expect(result).toBe('ظرف طارئ\nسامية')
  })

  it('سطر فيه متغيرين وواحد فاضي بينشال', () => {
    expect(fillTemplate('أ\nرابط: {رابط_الجلسة} {الساعة}\nب', { الساعة: '10:00', رابط_الجلسة: '' })).toBe('أ\nب')
  })

  it('متغير غير معروف بيضل مكتوب (عشان سامية تنتبه بالمعاينة)', () => {
    expect(fillTemplate('مرحبا {اسم_غلط}', {})).toBe('مرحبا {اسم_غلط}')
  })

  it('بيتعامل مع أسطر ويندوز وبيشيل الفراغ من الأطراف', () => {
    expect(fillTemplate('أ\r\n{السبب}\r\nب\r\n', { السبب: null })).toBe('أ\nب')
  })

  it('القالب الافتراضي للدعوة بيطلع كامل', () => {
    const result = fillTemplate(DEFAULT_TEMPLATES.invite_client, {
      الاسم: 'ليلى',
      اليوم: 'الثلاثاء',
      التاريخ: '20/10/2026',
      الساعة: '10:00',
      رابط_الجلسة: 'https://zoom.us/j/1',
      رابط_الرد: 'https://app/a/t',
    })
    expect(result.split('\n')).toEqual([
      'مرحبا ليلى،',
      'تم تحديد جلسة إلك يوم الثلاثاء 20/10/2026 الساعة 10:00.',
      'رابط الجلسة (زوم): https://zoom.us/j/1',
      'الرجاء تأكيد الموعد من هون: https://app/a/t',
      'سامية يحيى',
    ])
  })
})

describe('القوالب الافتراضية', () => {
  it('العشر قوالب موجودة وكلها بتستعمل متغيرات معروفة بس', () => {
    expect(Object.keys(DEFAULT_TEMPLATES).sort()).toEqual([...TEMPLATE_KEYS].sort())
    for (const key of TEMPLATE_KEYS) {
      for (const v of templateVariablesIn(DEFAULT_TEMPLATES[key])) {
        expect(TEMPLATE_VARIABLES).toContain(v)
      }
    }
  })

  it('resolveTemplates بيكمّل الناقص من الافتراضي', () => {
    const resolved = resolveTemplates({ invite_client: 'نص مخصص', cancel_client: '   ' })
    expect(resolved.invite_client).toBe('نص مخصص')
    expect(resolved.cancel_client).toBe(DEFAULT_TEMPLATES.cancel_client)
    expect(resolveTemplates(null)).toEqual(DEFAULT_TEMPLATES)
    expect(resolveTemplates('garbage')).toEqual(DEFAULT_TEMPLATES)
  })
})
