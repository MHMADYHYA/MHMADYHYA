import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('بيبلّش بـ BOM وبيهرب الفواصل والاقتباسات والأسطر', () => {
    const csv = toCsv(
      [
        { name: 'ليلى حسن', note: 'ملاحظة, فيها فاصلة', n: 3 },
        { name: 'قال "مرحبا"', note: 'سطر\nثاني', n: null },
      ],
      [
        { key: 'name', label: 'الاسم' },
        { key: 'note', label: 'ملاحظة' },
        { key: 'n', label: 'عدد', value: (r) => (r.n === null ? '' : r.n * 2) },
      ],
    )
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.slice(1).split('\r\n')).toEqual([
      'الاسم,ملاحظة,عدد',
      'ليلى حسن,"ملاحظة, فيها فاصلة",6',
      '"قال ""مرحبا""","سطر\nثاني",',
      '',
    ])
  })
})
