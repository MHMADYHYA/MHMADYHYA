/**
 * قوالب الرسائل (القسم 7 من الخطة) وتعبئتها.
 * قاعدة: سطر فيه متغير معروف بس قيمته فاضية بينشال كامل.
 */
export type MessageKind = 'invite' | 'change' | 'cancel' | 'reminder_day' | 'reminder_hour'
export type Recipient = 'client' | 'companion'
export type TemplateKey = `${MessageKind}_${Recipient}`

export const TEMPLATE_KEYS: TemplateKey[] = [
  'invite_client',
  'invite_companion',
  'change_client',
  'change_companion',
  'cancel_client',
  'cancel_companion',
  'reminder_day_client',
  'reminder_day_companion',
  'reminder_hour_client',
  'reminder_hour_companion',
]

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  invite_client: 'دعوة للزبون',
  invite_companion: 'دعوة للمرافق',
  change_client: 'تغيير موعد للزبون',
  change_companion: 'تغيير موعد للمرافق',
  cancel_client: 'إلغاء للزبون',
  cancel_companion: 'إلغاء للمرافق',
  reminder_day_client: 'تذكير قبل بيوم للزبون',
  reminder_day_companion: 'تذكير قبل بيوم للمرافق',
  reminder_hour_client: 'تذكير قبل بساعة للزبون',
  reminder_hour_companion: 'تذكير قبل بساعة للمرافق',
}

export const TEMPLATE_VARIABLES = [
  'الاسم',
  'اسم_المرافق',
  'اليوم',
  'التاريخ',
  'الساعة',
  'اليوم_القديم',
  'التاريخ_القديم',
  'الساعة_القديمة',
  'رابط_الجلسة',
  'مكان_الجلسة',
  'رابط_الرد',
  'السبب',
] as const

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number]
export type TemplateVars = Partial<Record<TemplateVariable, string | null | undefined>>

export const TEMPLATE_VARIABLE_LABELS: Record<TemplateVariable, string> = {
  الاسم: 'الاسم الأول للزبون',
  اسم_المرافق: 'اسم المرافق',
  اليوم: 'اليوم',
  التاريخ: 'التاريخ',
  الساعة: 'الساعة',
  اليوم_القديم: 'اليوم القديم',
  التاريخ_القديم: 'التاريخ القديم',
  الساعة_القديمة: 'الساعة القديمة',
  رابط_الجلسة: 'رابط الزوم',
  مكان_الجلسة: 'عنوان الجلسة الوجاهية',
  رابط_الرد: 'رابط الرد',
  السبب: 'سبب الإلغاء',
}

export const DEFAULT_TEMPLATES: Record<TemplateKey, string> = {
  invite_client: [
    'مرحبا {الاسم}،',
    'تم تحديد جلسة إلك يوم {اليوم} {التاريخ} الساعة {الساعة}.',
    'رابط الجلسة (زوم): {رابط_الجلسة}',
    'مكان الجلسة: {مكان_الجلسة}',
    'الرجاء تأكيد الموعد من هون: {رابط_الرد}',
    'سامية يحيى',
  ].join('\n'),
  invite_companion: [
    'مرحبا {اسم_المرافق}،',
    'تم تحديد جلسة لـ{الاسم} يوم {اليوم} {التاريخ} الساعة {الساعة}، وإنت مسجّل/ة كمرافق/ة.',
    'رابط الجلسة (زوم): {رابط_الجلسة}',
    'مكان الجلسة: {مكان_الجلسة}',
    'سامية يحيى',
  ].join('\n'),
  change_client: [
    'مرحبا {الاسم}،',
    'تم تغيير موعد جلستك.',
    'الموعد القديم: يوم {اليوم_القديم} {التاريخ_القديم} الساعة {الساعة_القديمة}',
    'الموعد الجديد: يوم {اليوم} {التاريخ} الساعة {الساعة}',
    'رابط الجلسة (زوم): {رابط_الجلسة}',
    'مكان الجلسة: {مكان_الجلسة}',
    'الرجاء تأكيد الموعد الجديد من هون: {رابط_الرد}',
    'سامية يحيى',
  ].join('\n'),
  change_companion: [
    'مرحبا {اسم_المرافق}،',
    'تم تغيير موعد جلسة {الاسم}.',
    'الموعد القديم: يوم {اليوم_القديم} {التاريخ_القديم} الساعة {الساعة_القديمة}',
    'الموعد الجديد: يوم {اليوم} {التاريخ} الساعة {الساعة}',
    'رابط الجلسة (زوم): {رابط_الجلسة}',
    'مكان الجلسة: {مكان_الجلسة}',
    'سامية يحيى',
  ].join('\n'),
  cancel_client: [
    'مرحبا {الاسم}،',
    'بنعلمك إنو الجلسة يوم {اليوم} {التاريخ} الساعة {الساعة} انلغت.',
    '{السبب}',
    'سامية يحيى',
  ].join('\n'),
  cancel_companion: [
    'مرحبا {اسم_المرافق}،',
    'بنعلمك إنو جلسة {الاسم} يوم {اليوم} {التاريخ} الساعة {الساعة} انلغت.',
    'سامية يحيى',
  ].join('\n'),
  reminder_day_client: [
    'مرحبا {الاسم}،',
    'تذكير بجلستك يوم {اليوم} {التاريخ} الساعة {الساعة}.',
    'رابط الجلسة (زوم): {رابط_الجلسة}',
    'مكان الجلسة: {مكان_الجلسة}',
    'للتأكيد أو التغيير: {رابط_الرد}',
    'سامية يحيى',
  ].join('\n'),
  reminder_day_companion: [
    'مرحبا {اسم_المرافق}،',
    'تذكير بجلسة {الاسم} يوم {اليوم} {التاريخ} الساعة {الساعة}.',
    'رابط الجلسة (زوم): {رابط_الجلسة}',
    'مكان الجلسة: {مكان_الجلسة}',
    'سامية يحيى',
  ].join('\n'),
  reminder_hour_client: [
    'مرحبا {الاسم}،',
    'تذكير: جلستك اليوم الساعة {الساعة}.',
    'رابط الجلسة (زوم): {رابط_الجلسة}',
    'مكان الجلسة: {مكان_الجلسة}',
    'سامية يحيى',
  ].join('\n'),
  reminder_hour_companion: [
    'مرحبا {اسم_المرافق}،',
    'تذكير: جلسة {الاسم} اليوم الساعة {الساعة}.',
    'رابط الجلسة (زوم): {رابط_الجلسة}',
    'مكان الجلسة: {مكان_الجلسة}',
    'سامية يحيى',
  ].join('\n'),
}

const PLACEHOLDER = /\{([^{}\s]+)\}/g
const KNOWN = new Set<string>(TEMPLATE_VARIABLES)

/**
 * تعبئة قالب: بيستبدل {المتغير} بقيمته.
 * سطر فيه متغير معروف قيمته فاضية بينشال كامل. متغير غير معروف بيضل مكتوب زي ما هو.
 */
export function fillTemplate(template: string, vars: TemplateVars): string {
  const lines = template.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  for (const line of lines) {
    let drop = false
    const filled = line.replace(PLACEHOLDER, (match, name: string) => {
      if (!KNOWN.has(name)) return match
      const value = vars[name as TemplateVariable]
      if (value === undefined || value === null || String(value).trim() === '') {
        drop = true
        return ''
      }
      return String(value)
    })
    if (!drop) out.push(filled)
  }
  return out.join('\n').trim()
}

/** بيرجع القوالب من الإعدادات مع تعبئة الناقص من الافتراضي */
export function resolveTemplates(stored: unknown): Record<TemplateKey, string> {
  const result = { ...DEFAULT_TEMPLATES }
  if (stored && typeof stored === 'object') {
    for (const key of TEMPLATE_KEYS) {
      const value = (stored as Record<string, unknown>)[key]
      if (typeof value === 'string' && value.trim() !== '') result[key] = value
    }
  }
  return result
}

/** المتغيرات المستعملة بقالب معيّن (للمعاينة والأزرار) */
export function templateVariablesIn(template: string): string[] {
  const names = new Set<string>()
  for (const match of template.matchAll(PLACEHOLDER)) names.add(match[1])
  return [...names]
}
