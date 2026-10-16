import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { env } from './env'

export type AppSupabaseClient = SupabaseClient<Database>

let client: AppSupabaseClient | null = null

/** هل مفاتيح Supabase موجودة بملف .env؟ */
export function isSupabaseConfigured(): boolean {
  return !env.missing.includes('VITE_SUPABASE_URL') && !env.missing.includes('VITE_SUPABASE_ANON_KEY')
}

/**
 * عميل Supabase للواجهة. بيستعمل مفتاح anon فقط (القسم 10 من الخطة).
 * بيرجع null إذا متغيرات البيئة ناقصة، عشان التطبيق يفتح ويعرض شرح بدل ما يطيح.
 */
export function getSupabase(): AppSupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (!client) {
    client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  }
  return client
}

/** نفس الشي بس بيرمي خطأ واضح إذا مش مجهّز (للاستعمال جوا الصفحات المحمية) */
export function requireSupabase(): AppSupabaseClient {
  const c = getSupabase()
  if (!c) throw new Error('Supabase مش مجهّز. راجع ملف .env')
  return c
}

export interface HealthResult {
  ok: boolean
  message: string
}

/**
 * فحص بسيط إنو رابط ومفتاح Supabase صحيحين، بدون أي جداول.
 * بيستعمل نقطة الصحة العامة لخدمة الدخول (auth/v1/health).
 */
export async function checkSupabaseHealth(
  supabaseUrl: string,
  anonKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<HealthResult> {
  if (!supabaseUrl || !anonKey) {
    return { ok: false, message: 'الرابط أو المفتاح ناقص بملف .env' }
  }
  try {
    const response = await fetchImpl(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/health`, {
      headers: { apikey: anonKey },
    })
    if (response.status === 401 || response.status === 403) {
      return { ok: false, message: 'الرابط صحيح بس المفتاح مرفوض. تأكد إنك نسخت مفتاح anon / Publishable.' }
    }
    if (!response.ok) {
      return { ok: false, message: `Supabase رجّع خطأ (${response.status}). تأكد من الرابط.` }
    }
    return { ok: true, message: 'الاتصال بـ Supabase شغال.' }
  } catch {
    return { ok: false, message: 'ما قدرنا نوصل للرابط. تأكد من الإنترنت ومن VITE_SUPABASE_URL.' }
  }
}
