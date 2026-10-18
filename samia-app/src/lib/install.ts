/**
 * زر "ثبّتي التطبيق": Chrome بيبعت حدث beforeinstallprompt لما التطبيق قابل للتثبيت وما انثبّت بعد.
 * بنمسك الحدث بأول تحميل الصفحة (قبل React) وبنستعمله لما سامية تكبس الزر.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallState {
  /** في حدث تثبيت جاهز (Chrome) */
  canInstall: boolean
  /** انثبّت هلأ (حدث appinstalled) */
  installed: boolean
}

let deferred: BeforeInstallPromptEvent | null = null
let state: InstallState = { canInstall: false, installed: false }
const listeners = new Set<() => void>()
let initialized = false

function setState(next: InstallState) {
  state = next
  listeners.forEach((listener) => listener())
}

/** بينادى مرة وحدة بـ main.tsx */
export function initInstallPrompt(target: Window = window): void {
  if (initialized) return
  initialized = true
  target.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault() // بنعرض زرنا بدل شريط Chrome الصغير
    deferred = event as BeforeInstallPromptEvent
    setState({ canInstall: true, installed: false })
  })
  target.addEventListener('appinstalled', () => {
    deferred = null
    setState({ canInstall: false, installed: true })
  })
}

export function getInstallState(): InstallState {
  return state
}

export function subscribeInstallState(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** بيفتح نافذة التثبيت تبعت Chrome */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferred
  if (!event) return 'unavailable'
  await event.prompt()
  const { outcome } = await event.userChoice
  deferred = null // الحدث بينستعمل مرة وحدة
  setState({ canInstall: false, installed: outcome === 'accepted' })
  return outcome
}

/** هل التطبيق مفتوح كتطبيق مثبّت (مش جوا تبويب بالمتصفح)؟ */
export function isRunningInstalled(): boolean {
  if (typeof window === 'undefined') return false
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false
  return standalone || (navigator as { standalone?: boolean }).standalone === true
}

/** للاختبارات بس */
export function resetInstallPromptForTests(): void {
  deferred = null
  initialized = false
  listeners.clear()
  state = { canInstall: false, installed: false }
}
