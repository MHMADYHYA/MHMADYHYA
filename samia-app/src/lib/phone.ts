/**
 * تنظيف أرقام التلفون (القسم 6 من الخطة).
 * بتقبل: 0501234567, 050-123-4567, +972501234567, 00972501234567, 972 50 123 4567
 * وبتحفظ دايماً: 972501234567 (صيغة دولية بدون +)
 */
export type PhoneResult = { ok: true; phone: string } | { ok: false; error: string }

export const DEFAULT_COUNTRY_CODE = '972'

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩'
const PERSIAN = '۰۱۲۳۴۵۶۷۸۹'

const INVALID = 'رقم التلفون مش صالح. مثال: 0501234567 أو +972501234567'

function toLatinDigits(value: string): string {
  return value
    .split('')
    .map((ch) => {
      const a = ARABIC_INDIC.indexOf(ch)
      if (a >= 0) return String(a)
      const p = PERSIAN.indexOf(ch)
      if (p >= 0) return String(p)
      return ch
    })
    .join('')
}

export function normalizePhone(input: string | null | undefined): PhoneResult {
  if (input === null || input === undefined) return { ok: false, error: INVALID }
  let value = toLatinDigits(String(input)).trim()
  if (value === '') return { ok: false, error: 'اكتب رقم التلفون' }

  // شيل الفراغات والشرطات والنقاط والأقواس
  value = value.replace(/[\s\-.() ‏‎]/g, '')

  let international = false
  if (value.startsWith('+')) {
    value = value.slice(1)
    international = true
  } else if (value.startsWith('00')) {
    value = value.slice(2)
    international = true
  }

  if (!/^\d+$/.test(value)) return { ok: false, error: INVALID }

  let digits: string
  if (international) {
    digits = value
  } else if (value.startsWith('0')) {
    // رقم محلي: 0501234567 → 972501234567
    const local = value.replace(/^0+/, '')
    if (local.length < 8 || local.length > 9) return { ok: false, error: INVALID }
    digits = DEFAULT_COUNTRY_CODE + local
  } else if (value.length === 9 && value.startsWith('5')) {
    // 501234567 بدون صفر
    digits = DEFAULT_COUNTRY_CODE + value
  } else {
    // مكتوب بالصيغة الدولية بدون + (مثلاً 972501234567)
    digits = value
  }

  if (digits.startsWith('0')) return { ok: false, error: INVALID }
  if (digits.length < 8 || digits.length > 15) return { ok: false, error: INVALID }
  if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length !== 11 && digits.length !== 12) {
    return { ok: false, error: 'الرقم الإسرائيلي لازم يكون 9 أو 10 أرقام مع الصفر، مثال: 0501234567' }
  }

  return { ok: true, phone: digits }
}

/** عرض الرقم بشكل مقروء: 972501234567 → 050-123-4567 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return ''
  if (phone.startsWith(DEFAULT_COUNTRY_CODE) && (phone.length === 12 || phone.length === 11)) {
    const local = '0' + phone.slice(3)
    const areaLen = local.length === 10 ? 3 : 2
    return `${local.slice(0, areaLen)}-${local.slice(areaLen, areaLen + 3)}-${local.slice(areaLen + 3)}`
  }
  return `+${phone}`
}
