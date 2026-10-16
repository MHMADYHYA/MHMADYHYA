/** تحويل أخطاء Supabase/Postgres لرسائل عربية واضحة */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

interface PgLikeError {
  code?: string
  message?: string
  details?: string
  hint?: string
  status?: number
}

export const CONFLICT_CODE = '23P01'

export function isConflictError(err: unknown): boolean {
  const e = err as PgLikeError | undefined
  return !!e && (e.code === CONFLICT_CODE || /appointments_no_overlap/.test(e.message ?? ''))
}

export function toArabicError(err: unknown, fallback = 'صار خطأ غير متوقع. جرّب مرة ثانية.'): string {
  if (err instanceof AppError) return err.message
  const e = err as PgLikeError | undefined
  if (!e) return fallback
  const message = e.message ?? ''

  if (isConflictError(e)) return 'في موعد ثاني بنفس الوقت.'
  if (e.code === '42501' || /not_admin|permission denied|row-level security/i.test(message)) {
    return 'ما عندك صلاحية لهاد الإجراء. تأكد إنك مسجّلة دخول بحساب سامية.'
  }
  if (e.code === '23514') {
    if (/phone/.test(message)) return 'رقم التلفون مش صالح.'
    if (/companion/.test(message)) return 'لازم تكتب اسم ورقم المرافق.'
    return 'في قيمة غير صالحة بالنموذج.'
  }
  if (e.code === '23503') return 'ما بنقدر نحذف هاد العنصر لأنه مرتبط بمواعيد.'
  if (e.code === '23505') return 'هاد العنصر موجود من قبل.'
  if (/appointment_cancelled/.test(message)) return 'الموعد ملغي، ما بنقدر نغيّر وقته. عيّن موعد جديد.'
  if (/not_found|P0002/.test(message)) return 'الموعد مش موجود.'
  if (/Invalid login credentials/i.test(message)) return 'الإيميل أو كلمة السر غلط.'
  if (/Email not confirmed/i.test(message)) return 'الإيميل لسا مش مأكّد.'
  if (/rate limit|too many requests/i.test(message)) return 'جرّبتي كثير بوقت قصير. استني شوي وجرّبي مرة ثانية.'
  if (/Password should be at least/i.test(message)) return 'كلمة السر قصيرة. لازم 6 أحرف على الأقل.'
  if (/Failed to fetch|NetworkError|network/i.test(message)) return 'ما في اتصال بالإنترنت، أو مشروع Supabase متوقف.'
  if (/JWT|session|refresh_token/i.test(message)) return 'انتهت الجلسة. سجّلي دخول من جديد.'
  return message ? `صار خطأ: ${message}` : fallback
}
