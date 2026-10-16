/// <reference lib="webworker" />
/**
 * Service Worker: تخزين ملفات التطبيق للعمل بدون إنترنت، واستقبال التنبيهات (Web Push).
 */
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// كل المسارات بتفتح index.html (تطبيق صفحة واحدة)
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

interface PushPayload {
  title?: string
  body?: string
  url?: string
  tag?: string
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = {}
  try {
    payload = event.data ? (event.data.json() as PushPayload) : {}
  } catch {
    payload = { body: event.data?.text() ?? '' }
  }
  const title = payload.title ?? 'مواعيد سامية يحيى'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      tag: payload.tag ?? 'samia-app',
      data: { url: payload.url ?? '/messages' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/'
  event.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const sameOrigin = list.filter((c) => c.url.startsWith(self.location.origin))
      for (const client of sameOrigin) {
        try {
          if ('navigate' in client) await client.navigate(url)
          return await client.focus()
        } catch {
          // نجرّب النافذة اللي بعدها
        }
      }
      try {
        return await self.clients.openWindow(url)
      } catch {
        return undefined
      }
    })(),
  )
})
