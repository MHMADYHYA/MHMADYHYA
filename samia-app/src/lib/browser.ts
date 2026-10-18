/**
 * أي متصفح فاتح التطبيق، عشان نوجّه سامية لـ Chrome على أندرويد.
 * على أندرويد التثبيت كتطبيق حقيقي والتنبيهات مضمونين بـ Chrome. متصفح سامسونج (Samsung Internet)
 * بيحط اختصار بيفتح جوا المتصفح، والمتصفحات اللي جوا تطبيقات ثانية (واتساب، فيسبوك...) ما فيها تنبيهات.
 */

export type BrowserKind = 'samsung' | 'android-in-app' | 'android-chrome' | 'other'

/** متصفحات أندرويد مبنية على Chromium بس مش Chrome نفسه */
const OTHER_CHROMIUM = /(EdgA|OPR|OPX|OPT|Firefox|YaBrowser|MiuiBrowser|HuaweiBrowser|HeyTapBrowser|UCBrowser|Vivaldi|DuckDuckGo|Silk)\//i

export function detectBrowser(userAgent: string): BrowserKind {
  if (!/Android/i.test(userAgent)) return 'other'
  if (/SamsungBrowser\//i.test(userAgent)) return 'samsung'
  if (/; wv\)/.test(userAgent) || /\b(FBAN|FBAV|Instagram|Line\/|WhatsApp)/i.test(userAgent)) return 'android-in-app'
  if (/Chrome\/\d+/.test(userAgent) && !OTHER_CHROMIUM.test(userAgent)) return 'android-chrome'
  return 'other'
}

/** هل لازم نقترح فتح التطبيق بـ Chrome؟ */
export function shouldSuggestChrome(kind: BrowserKind): boolean {
  return kind === 'samsung' || kind === 'android-in-app'
}

export const CHROME_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.android.chrome'

/**
 * رابط أندرويد بيفتح نفس الصفحة بـ Chrome مباشرة. إذا Chrome مش موجود، بيفتح صفحته بمتجر Google Play.
 * (الجزء بعد # بالرابط الأصلي ما بينحمل، التطبيق ما بيستعمله)
 */
export function chromeIntentUrl(href: string): string {
  const url = new URL(href)
  const scheme = url.protocol.replace(':', '')
  return (
    `intent://${url.host}${url.pathname}${url.search}` +
    `#Intent;scheme=${scheme};package=com.android.chrome;` +
    `S.browser_fallback_url=${encodeURIComponent(CHROME_PLAY_STORE_URL)};end`
  )
}
