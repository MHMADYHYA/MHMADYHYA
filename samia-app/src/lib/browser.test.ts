import { describe, expect, it } from 'vitest'
import { CHROME_PLAY_STORE_URL, chromeIntentUrl, detectBrowser, shouldSuggestChrome } from './browser'

// بصمات متصفحات حقيقية
const UA = {
  // تلفون سامية (من سجل الدخول)
  samsung:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/30.0 Chrome/143.0.0.0 Mobile Safari/537.36',
  androidChrome: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
  androidWebView:
    'Mozilla/5.0 (Linux; Android 14; SM-A546B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/143.0.0.0 Mobile Safari/537.36',
  facebookInApp:
    'Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36 [FBAN/EMA;FBLC/ar_AR;FBAV/400.0.0.0;]',
  edgeAndroid: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36 EdgA/143.0.0.0',
  miBrowser:
    'Mozilla/5.0 (Linux; U; Android 13; ar-ae; 2201117TY Build/TKQ1.221114.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.5.1-gn',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  desktopChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
}

describe('معرفة المتصفح', () => {
  it('متصفح سامسونج (تلفون سامية) بينعرف، وبنقترح Chrome', () => {
    expect(detectBrowser(UA.samsung)).toBe('samsung')
    expect(shouldSuggestChrome(detectBrowser(UA.samsung))).toBe(true)
  })

  it('المتصفحات اللي جوا تطبيقات ثانية بتنعرف، وبنقترح Chrome', () => {
    expect(detectBrowser(UA.androidWebView)).toBe('android-in-app')
    expect(detectBrowser(UA.facebookInApp)).toBe('android-in-app')
    expect(shouldSuggestChrome('android-in-app')).toBe(true)
  })

  it('Chrome على أندرويد ما بيطلعله اقتراح', () => {
    expect(detectBrowser(UA.androidChrome)).toBe('android-chrome')
    expect(shouldSuggestChrome('android-chrome')).toBe(false)
  })

  it('غير هيك ما بنقترح إشي (Edge، شاومي، فايرفوكس، آيفون، كمبيوتر)', () => {
    for (const ua of [UA.edgeAndroid, UA.miBrowser, UA.firefoxAndroid, UA.iphone, UA.desktopChrome]) {
      expect(detectBrowser(ua)).toBe('other')
    }
    expect(shouldSuggestChrome('other')).toBe(false)
  })
})

describe('رابط فتح الصفحة بـ Chrome', () => {
  it('بيفتح نفس الصفحة بـ Chrome، وإذا Chrome مش موجود بيروح لمتجر Google Play', () => {
    expect(chromeIntentUrl('https://samia-appointments.pages.dev/settings?tab=1')).toBe(
      'intent://samia-appointments.pages.dev/settings?tab=1#Intent;scheme=https;package=com.android.chrome;' +
        `S.browser_fallback_url=${encodeURIComponent(CHROME_PLAY_STORE_URL)};end`,
    )
  })

  it('الجزء بعد # بينشال لأنه بيخرّب رابط أندرويد', () => {
    expect(chromeIntentUrl('https://samia-appointments.pages.dev/calendar#x')).toMatch(
      /^intent:\/\/samia-appointments\.pages\.dev\/calendar#Intent;/,
    )
  })
})
