import { useState } from 'react'
import { BrandLockup } from '../components/BrandLockup'
import { ButterflyMark } from '../components/ButterflyMark'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { StatusBadge } from '../components/StatusBadge'
import { AlertCircleIcon, CheckCircleIcon, LockIcon } from '../components/Icons'
import { env } from '../lib/env'
import { formatDayAndDate, greetingFor } from '../lib/dates'
import { APPOINTMENT_STATUSES } from '../lib/status'
import { BRAND_COLORS } from '../lib/theme'
import { checkSupabaseHealth, type HealthResult } from '../lib/supabase'

const ENV_VARS: { name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY' | 'VITE_PUBLIC_BASE_URL'; label: string }[] = [
  { name: 'VITE_SUPABASE_URL', label: 'رابط مشروع Supabase' },
  { name: 'VITE_SUPABASE_ANON_KEY', label: 'المفتاح العام (anon)' },
  { name: 'VITE_PUBLIC_BASE_URL', label: 'رابط التطبيق' },
]

interface WelcomePageProps {
  /** للاختبارات: تثبيت الوقت الحالي */
  now?: Date
}

/**
 * صفحة المرحلة 0: بتعرض اللوجو والاسم والألوان، وبتفحص إنو ملف .env وSupabase جاهزين.
 * بالمرحلة 1 بتصير صفحة تسجيل الدخول والتقويم.
 */
export function WelcomePage({ now = new Date() }: WelcomePageProps) {
  const [health, setHealth] = useState<HealthResult | null>(null)
  const [checking, setChecking] = useState(false)
  const supabaseEnvReady =
    !env.missing.includes('VITE_SUPABASE_URL') && !env.missing.includes('VITE_SUPABASE_ANON_KEY')

  async function runHealthCheck() {
    setChecking(true)
    setHealth(null)
    const result = await checkSupabaseHealth(env.supabaseUrl, env.supabaseAnonKey)
    setHealth(result)
    setChecking(false)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <BrandLockup />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-3 px-4 py-6">
        <section className="flex items-center gap-3 pb-2">
          <ButterflyMark size={28} />
          <div>
            <h1 className="text-2xl font-semibold text-ink">{greetingFor(now)}</h1>
            <p className="text-muted">{formatDayAndDate(now)}</p>
          </div>
        </section>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">حالة التجهيز</h2>
          <ul className="divide-y divide-border">
            {ENV_VARS.map(({ name, label }) => {
              const missing = env.missing.includes(name)
              return (
                <li key={name} className="flex items-center gap-3 py-3">
                  {missing ? (
                    <AlertCircleIcon className="shrink-0 text-coral-strong" />
                  ) : (
                    <CheckCircleIcon className="shrink-0 text-status-confirmed-fg" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{label}</p>
                    <p className="truncate text-sm text-muted" dir="ltr">
                      {name}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      missing ? 'bg-coral-soft text-coral-text' : 'bg-status-confirmed text-status-confirmed-fg'
                    }`}
                  >
                    {missing ? 'ناقص' : 'موجود'}
                  </span>
                </li>
              )
            })}
          </ul>

          {env.missing.length > 0 && (
            <p className="mt-3 rounded-xl bg-coral-soft p-3 text-sm text-coral-text">
              انسخ ملف <span dir="ltr">.env.example</span> باسم <span dir="ltr">.env</span> وعبّي القيم الناقصة، بعدين
              أعد تشغيل <span dir="ltr">npm run dev</span>. الشرح الكامل بملف{' '}
              <span dir="ltr">docs/SUPABASE_SETUP.md</span>.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={runHealthCheck} disabled={!supabaseEnvReady || checking}>
              {checking ? 'لحظة...' : 'جرّب الاتصال بـ Supabase'}
            </Button>
            {health && (
              <p
                role="status"
                className={`flex items-center gap-2 text-sm font-semibold ${
                  health.ok ? 'text-status-confirmed-fg' : 'text-coral-text'
                }`}
              >
                {health.ok ? <CheckCircleIcon /> : <AlertCircleIcon />}
                {health.message}
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">الألوان</h2>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {BRAND_COLORS.map((color) => (
              <li key={color.token}>
                <div
                  className="h-12 rounded-xl border border-border"
                  style={{ backgroundColor: color.hex }}
                  aria-hidden="true"
                />
                <p className="mt-1.5 text-sm font-semibold">{color.label}</p>
                <p className="text-xs text-muted" dir="ltr">
                  {color.hex}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">حالات الموعد</h2>
          <div className="flex flex-wrap gap-2">
            {APPOINTMENT_STATUSES.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">الأزرار</h2>
          <div className="flex flex-wrap gap-2">
            <Button>زر رئيسي</Button>
            <Button variant="secondary">زر ثانوي</Button>
            <Button variant="ghost">زر خفيف</Button>
          </div>
        </Card>

        <Card className="flex flex-col items-center py-10 text-center">
          <ButterflyMark size={72} className="opacity-30" title="" />
          <p className="mt-3 text-muted">يوم هادي، ما في جلسات اليوم</p>
        </Card>
      </main>

      <footer className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 text-xs text-muted">
        <span>المرحلة 0: التجهيز</span>
        <span className="flex items-center gap-1">
          <LockIcon width="14" height="14" />
          بياناتك محمية
        </span>
      </footer>
    </div>
  )
}
