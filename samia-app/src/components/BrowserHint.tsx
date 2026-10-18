import { useState } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { chromeIntentUrl, detectBrowser, shouldSuggestChrome } from '../lib/browser'
import { isRunningInstalled, promptInstall } from '../lib/install'
import { Button, buttonClassName } from './Button'
import { InfoIcon } from './Icons'

const APP_HOST = 'samia-appointments.pages.dev'

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem('install-hint-dismissed') === '1'
  } catch {
    return false
  }
}

function writeDismissed() {
  try {
    sessionStorage.setItem('install-hint-dismissed', '1')
  } catch {
    // مش مهم إذا التخزين مسكّر
  }
}

/** زر بيفتح نفس الصفحة بـ Chrome (رابط أندرويد) */
export function OpenInChromeButton({ href, className = '' }: { href?: string; className?: string }) {
  const target = href ?? (typeof window !== 'undefined' ? window.location.href : `https://${APP_HOST}/`)
  return (
    <a href={chromeIntentUrl(target)} className={buttonClassName('primary', className)}>
      افتحي بـ Chrome
    </a>
  )
}

/**
 * شريط بأعلى التطبيق وبصفحة الدخول:
 * - بمتصفح سامسونج أو متصفح جوا تطبيق ثاني: "افتحي بـ Chrome"
 * - بـ Chrome لما التطبيق مش مثبّت: "ثبّتي التطبيق"
 */
export function BrowserHint({ userAgent }: { userAgent?: string }) {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '')
  const kind = detectBrowser(ua)
  const install = useInstallPrompt()
  const [dismissed, setDismissed] = useState(readDismissed)
  const [busy, setBusy] = useState(false)

  if (shouldSuggestChrome(kind)) {
    return (
      <div role="region" aria-label="افتحي التطبيق بـ Chrome" className="mb-4 rounded-card bg-coral-soft p-3.5 text-sm text-coral-text">
        <div className="flex items-start gap-3">
          <InfoIcon className="mt-0.5 shrink-0" />
          <div className="flex-1 space-y-3 leading-relaxed">
            <p>
              {kind === 'samsung' ? 'التطبيق مفتوح بمتصفح سامسونج.' : 'التطبيق مفتوح جوا تطبيق ثاني.'} عشان تثبّتيه على التلفون وتوصلك
              التنبيهات، افتحيه بـ Chrome وثبّتيه من هناك. بـ Chrome بتسجّلي دخول مرة وحدة.
            </p>
            <OpenInChromeButton className="w-full sm:w-auto" />
            <p className="text-xs">
              إذا ما انفتح: افتحي Chrome واكتبي{' '}
              <span dir="ltr" className="inline-block whitespace-nowrap font-semibold">
                {APP_HOST}
              </span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (install.canInstall && !install.installed && !isRunningInstalled() && !dismissed) {
    return (
      <div role="region" aria-label="ثبّتي التطبيق" className="mb-4 rounded-card bg-primary-soft p-3.5 text-sm text-primary">
        <div className="flex items-start gap-3">
          <InfoIcon className="mt-0.5 shrink-0" />
          <div className="flex-1 space-y-3 leading-relaxed">
            <p>ثبّتي التطبيق على التلفون، عشان يفتح لحاله من أيقونة "مواعيد" وتوصلك التنبيهات.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await promptInstall()
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {busy ? 'لحظة...' : 'ثبّتي التطبيق'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  writeDismissed()
                  setDismissed(true)
                }}
              >
                مش هلأ
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
