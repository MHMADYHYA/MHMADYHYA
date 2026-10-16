/** منطق الزوم بدون اعتماديات (ينختبر بـ Vitest وينستعمل بـ Edge Function) */

export interface ZoomConfig {
  accountId: string
  clientId: string
  clientSecret: string
}

export function readZoomConfig(get: (name: string) => string | undefined): ZoomConfig | null {
  const accountId = get('ZOOM_ACCOUNT_ID')?.trim()
  const clientId = get('ZOOM_CLIENT_ID')?.trim()
  const clientSecret = get('ZOOM_CLIENT_SECRET')?.trim()
  if (!accountId || !clientId || !clientSecret) return null
  return { accountId, clientId, clientSecret }
}

export const ZOOM_TOKEN_URL = 'https://zoom.us/oauth/token'
export const ZOOM_API = 'https://api.zoom.us/v2'

export function tokenRequest(config: ZoomConfig): { url: string; init: RequestInit } {
  const params = new URLSearchParams({ grant_type: 'account_credentials', account_id: config.accountId })
  const basic = btoa(`${config.clientId}:${config.clientSecret}`)
  return {
    url: `${ZOOM_TOKEN_URL}?${params.toString()}`,
    init: { method: 'POST', headers: { Authorization: `Basic ${basic}` } },
  }
}

export interface MeetingInput {
  /** ساعة الحائط بدون offset: 2026-10-20T10:00:00 */
  start_time: string
  duration: number
  timezone?: string
}

/** عنوان الاجتماع "جلسة" بس (بدون اسم الزبون)، غرفة انتظار، وبدون دخول قبل المضيف */
export function buildMeetingPayload(input: MeetingInput) {
  return {
    topic: 'جلسة',
    type: 2,
    start_time: input.start_time,
    duration: input.duration,
    timezone: input.timezone ?? 'Asia/Jerusalem',
    settings: {
      waiting_room: true,
      join_before_host: false,
      host_video: true,
      participant_video: true,
      mute_upon_entry: false,
      approval_type: 2,
      audio: 'both',
    },
  }
}

export interface ParsedMeeting {
  id: string
  join_url: string
}

export function parseMeeting(json: unknown): ParsedMeeting | null {
  const m = json as { id?: number | string; join_url?: string } | null
  if (!m || m.id === undefined || !m.join_url) return null
  return { id: String(m.id), join_url: m.join_url }
}

export function describeZoomError(status: number, body: unknown): string {
  const message = (body as { message?: string } | null)?.message
  if (status === 401) return 'الزوم رفض المفاتيح. تأكدي من Account ID وClient ID وClient Secret.'
  if (status === 404) return 'الاجتماع مش موجود بالزوم (يمكن انحذف).'
  if (status === 429) return 'الزوم وقّف الطلبات مؤقتاً (كثير طلبات). جرّبي بعد شوي.'
  return message ? `خطأ من الزوم (${status}): ${message}` : `خطأ من الزوم (${status})`
}
