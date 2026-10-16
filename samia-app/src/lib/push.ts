/** تنبيهات التلفون (Web Push) من جهة المتصفح */
import { AppError } from './errors'

export interface PushSupport {
  supported: boolean
  reason: string | null
  isIos: boolean
  installed: boolean
}

export function checkPushSupport(): PushSupport {
  const ua = navigator.userAgent
  const isIos = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const installed =
    window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (!hasApis) {
    return {
      supported: false,
      isIos,
      installed,
      reason: isIos && !installed ? 'على الآيفون التنبيهات بتشتغل بس بعد ما تضيفي التطبيق للشاشة الرئيسية.' : 'هاد المتصفح ما بيدعم التنبيهات.',
    }
  }
  return { supported: true, reason: null, isIos, installed }
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function readyRegistration(): Promise<ServiceWorkerRegistration> {
  const timeout = new Promise<never>((_, reject) =>
    window.setTimeout(() => reject(new AppError('ما قدرنا نوصل لـ Service Worker. أعيدي تحميل الصفحة وجرّبي مرة ثانية.')), 8000),
  )
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return null
  return reg.pushManager.getSubscription()
}

export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription> {
  if (!vapidPublicKey) throw new AppError('مفتاح التنبيهات (VITE_VAPID_PUBLIC_KEY) مش موجود بملف .env')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new AppError('ما انسمح بالتنبيهات. افتحي إعدادات المتصفح واسمحي بالتنبيهات لهاد الموقع.')
  const reg = await readyRegistration()
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) })
}

export async function unsubscribeFromPush(): Promise<string | null> {
  const sub = await getCurrentPushSubscription()
  if (!sub) return null
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  return endpoint
}

export function subscriptionToRow(sub: PushSubscription): { endpoint: string; p256dh: string; auth: string } {
  const json = sub.toJSON()
  const keys = json.keys ?? {}
  if (!keys.p256dh || !keys.auth) throw new AppError('اشتراك التنبيهات ناقص مفاتيح')
  return { endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth }
}
