/** ألوان الهوية، للعرض بصفحة التجهيز وللرجوع إلها بالكود */
export interface BrandColor {
  token: string
  hex: string
  label: string
  usage: string
}

export const BRAND_COLORS: BrandColor[] = [
  { token: 'primary', hex: '#1F4E5F', label: 'تيل', usage: 'الأزرار الرئيسية، الهيدر، الروابط' },
  { token: 'coral', hex: '#E07A5F', label: 'كورال', usage: 'لون ثانوي للتفاصيل' },
  { token: 'ink', hex: '#1C2B33', label: 'حبر', usage: 'النص الأساسي' },
  { token: 'muted', hex: '#5B6660', label: 'هادي', usage: 'النص الثانوي' },
  { token: 'background', hex: '#F8F5EF', label: 'خلفية', usage: 'خلفية الصفحات' },
  { token: 'surface', hex: '#FFFFFF', label: 'سطح', usage: 'البطاقات' },
  { token: 'border', hex: '#E2DCD0', label: 'حدود', usage: 'الحدود' },
  { token: 'primary-soft', hex: '#E3EEF1', label: 'تيل فاتح', usage: 'العنصر المختار، أزرار ثانوية' },
  { token: 'coral-soft', hex: '#FBE9E3', label: 'كورال فاتح', usage: 'تنبيهات لطيفة' },
  { token: 'coral-strong', hex: '#C8553D', label: 'كورال غامق', usage: 'شارات الأرقام' },
  { token: 'coral-text', hex: '#8E3B26', label: 'نص كورال', usage: 'نص على خلفية كورال فاتح' },
  { token: 'page-tint', hex: '#EFEAE1', label: 'تظليل', usage: 'خلفية مفتاح التبديل' },
]
