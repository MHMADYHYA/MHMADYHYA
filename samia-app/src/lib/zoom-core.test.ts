import { describe, expect, it } from 'vitest'
import { buildMeetingPayload, describeZoomError, parseMeeting, readZoomConfig, tokenRequest } from '../../supabase/functions/_shared/zoom-core'

describe('zoom-core', () => {
  it('المفاتيح لازم تكون كلها موجودة', () => {
    const env: Record<string, string> = { ZOOM_ACCOUNT_ID: 'a', ZOOM_CLIENT_ID: 'b', ZOOM_CLIENT_SECRET: 'c' }
    expect(readZoomConfig((k) => env[k])).toEqual({ accountId: 'a', clientId: 'b', clientSecret: 'c' })
    expect(readZoomConfig((k) => (k === 'ZOOM_CLIENT_SECRET' ? undefined : env[k]))).toBeNull()
    expect(readZoomConfig(() => '  ')).toBeNull()
  })

  it('طلب التوكن Server-to-Server', () => {
    const { url, init } = tokenRequest({ accountId: 'acc', clientId: 'id', clientSecret: 'secret' })
    expect(url).toBe('https://zoom.us/oauth/token?grant_type=account_credentials&account_id=acc')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${btoa('id:secret')}`)
  })

  it('عنوان الاجتماع "جلسة" بس، غرفة انتظار، وبدون دخول قبل المضيف', () => {
    const payload = buildMeetingPayload({ start_time: '2026-10-20T10:00:00', duration: 45 })
    expect(payload.topic).toBe('جلسة')
    expect(payload.type).toBe(2)
    expect(payload.timezone).toBe('Asia/Jerusalem')
    expect(payload.settings.waiting_room).toBe(true)
    expect(payload.settings.join_before_host).toBe(false)
    expect(JSON.stringify(payload)).not.toMatch(/ليلى|client|name/)
  })

  it('قراءة رد الزوم', () => {
    expect(parseMeeting({ id: 123456, join_url: 'https://zoom.us/j/123456?pwd=x' })).toEqual({ id: '123456', join_url: 'https://zoom.us/j/123456?pwd=x' })
    expect(parseMeeting({ id: 1 })).toBeNull()
    expect(parseMeeting(null)).toBeNull()
  })

  it('رسائل الأخطاء بالعربي', () => {
    expect(describeZoomError(401, {})).toContain('المفاتيح')
    expect(describeZoomError(404, {})).toContain('مش موجود')
    expect(describeZoomError(500, { message: 'boom' })).toContain('boom')
  })
})
