import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { BrandLockup } from '../../components/BrandLockup'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ErrorNotice, SoftNotice } from '../../components/Feedback'
import { Field, Input } from '../../components/Input'
import { toArabicError } from '../../lib/errors'
import { useAuth } from './AuthProvider'

/** صفحة اختيار كلمة سر جديدة بعد الكبس على رابط الإيميل */
export function ResetPasswordPage() {
  const { status, recovery, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const canUse = recovery || status === 'signed_in' || status === 'not_admin'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('كلمة السر لازم تكون 8 أحرف على الأقل.')
    if (password !== confirm) return setError('كلمتين السر مش متطابقتين.')
    setBusy(true)
    setError(null)
    try {
      await updatePassword(password)
      setDone(true)
      window.setTimeout(() => navigate('/calendar', { replace: true }), 1500)
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
      <Card className="w-full max-w-sm">
        <h1 className="mb-4 text-xl font-semibold">كلمة سر جديدة</h1>
        {status === 'loading' ? (
          <p className="text-muted">لحظة...</p>
        ) : !canUse ? (
          <SoftNotice>
            هاد الرابط انتهى أو مش صالح. ارجعي لصفحة الدخول واكبسي "نسيت كلمة السر" مرة ثانية.
            <div className="mt-3">
              <Button variant="secondary" onClick={() => navigate('/login')}>
                صفحة الدخول
              </Button>
            </div>
          </SoftNotice>
        ) : done ? (
          <SoftNotice tone="primary">تم تغيير كلمة السر. رح نحوّلك للتطبيق.</SoftNotice>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label="كلمة السر الجديدة" htmlFor="new-password" hint="8 أحرف على الأقل">
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field label="تأكيد كلمة السر" htmlFor="confirm-password">
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                dir="ltr"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
            {error && <ErrorNotice message={error} />}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'لحظة...' : 'احفظي كلمة السر'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
