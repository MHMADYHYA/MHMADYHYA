/**
 * قراءة متغيرات البيئة والتحقق منها.
 * القيم بتيجي من ملف .env (انظر .env.example).
 */
export interface AppEnv {
  supabaseUrl: string
  supabaseAnonKey: string
  publicBaseUrl: string
  /** المفتاح العام للتنبيهات (VAPID)، اختياري لحد المرحلة 4 */
  vapidPublicKey: string
  /** أسماء المتغيرات الناقصة أو غير الصالحة، فاضية إذا كل إشي تمام */
  missing: string[]
}

type EnvSource = Record<string, string | undefined>

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function readEnv(source: EnvSource = import.meta.env as EnvSource): AppEnv {
  const supabaseUrl = (source.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '')
  const supabaseAnonKey = (source.VITE_SUPABASE_ANON_KEY ?? '').trim()
  const publicBaseUrl = (source.VITE_PUBLIC_BASE_URL ?? '').trim().replace(/\/+$/, '')
  const vapidPublicKey = (source.VITE_VAPID_PUBLIC_KEY ?? '').trim()

  const missing: string[] = []
  if (!supabaseUrl || !isHttpUrl(supabaseUrl)) missing.push('VITE_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  if (!publicBaseUrl || !isHttpUrl(publicBaseUrl)) missing.push('VITE_PUBLIC_BASE_URL')

  return { supabaseUrl, supabaseAnonKey, publicBaseUrl, vapidPublicKey, missing }
}

export const env: AppEnv = readEnv()
