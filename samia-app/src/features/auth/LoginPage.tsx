import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { BrandLockup } from '../../components/BrandLockup'
import { BrowserHint } from '../../components/BrowserHint'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ErrorNotice, SoftNotice } from '../../components/Feedback'
import { Field, Input } from '../../components/Input'
import { toArabicError } from '../../lib/errors'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { status, signIn, signOut, sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [resetSent, setResetSent] = useState(false)

  if (status === 'signed_in') return <Navigate to="/calendar" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await sendPasswordReset(email)
        setResetSent(true)
      }
    } catch (err) {
      setError(toArabicError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <BrandLockup size="lg" />
      </div>
      <div className="w-full max-w-sm">
        <BrowserHint />
      </div>
      <Card className="w-full max-w-sm">
        {status === 'not_configured' ? (
          <SoftNotice>
            التطبيق لسا مش مربوط بـ Supabase. انسخ <span dir="ltr">.env.example</span> باسم <span dir="ltr">.env</span> وعبّي
            القيم حسب <span dir="ltr">docs/SUPABASE_SETUP.md</span>.
          </SoftNotice>
        ) : status === 'not_admin' ? (
          <div className="space-y-4">
            <ErrorNotice message="هاد الحساب مش مسموح له يدخل التطبيق. التطبيق لسامية بس." />
            <Button variant="secondary" className="w-full" onClick={() => void signOut()}>
              تسجيل خروج
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <h1 className="text-xl font-semibold">{mode === 'login' ? 'تسجيل الدخول' : 'نسيت كلمة السر'}</h1>
            {mode === 'forgot' && !resetSent && (
              <p className="text-sm text-muted">اكتبي إيميلك ورح يوصلك رابط لتغيير كلمة السر.</p>
            )}
            {resetSent ? (
              <SoftNotice tone="primary">
                بعتنالك رابط على <span dir="ltr">{email}</span>. افتحي الرسالة واكبسي على الرابط، وبعدين اختاري كلمة سر جديدة.
              </SoftNotice>
            ) : (
              <>
                <Field label="الإيميل" htmlFor="email">
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    dir="ltr"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                {mode === 'login' && (
                  <Field label="كلمة السر" htmlFor="password">
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      dir="ltr"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>
                )}
                {error && <ErrorNotice message={error} />}
                <Button type="submit" className="w-full" disabled={busy || !email || (mode === 'login' && !password)}>
                  {busy ? 'لحظة...' : mode === 'login' ? 'دخول' : 'ابعتي رابط التغيير'}
                </Button>
              </>
            )}
            <button
              type="button"
              className="block w-full text-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
              onClick={() => {
                setMode(mode === 'login' ? 'forgot' : 'login')
                setError(null)
                setResetSent(false)
              }}
            >
              {mode === 'login' ? 'نسيت كلمة السر' : 'رجوع لتسجيل الدخول'}
            </button>
          </form>
        )}
      </Card>
      <p className="mt-6 text-xs text-muted">هاد التطبيق خاص بسامية يحيى. ما في تسجيل حسابات جديدة.</p>
    </div>
  )
}
