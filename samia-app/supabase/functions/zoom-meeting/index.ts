/**
 * Edge Function: zoom-meeting
 * إنشاء / تعديل / حذف اجتماعات زوم عن طريق Server-to-Server OAuth.
 * مسموحة بس للمشرف (سامية) بعد التحقق من الجلسة.
 *
 * الأسرار (Supabase → Edge Functions → Secrets): ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  ZOOM_API,
  buildMeetingPayload,
  describeZoomError,
  parseMeeting,
  readZoomConfig,
  tokenRequest,
  type ZoomConfig,
} from '../_shared/zoom-core.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

async function isAdminCaller(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return false
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data, error } = await client.rpc('is_admin')
  return !error && data === true
}

async function getAccessToken(config: ZoomConfig): Promise<string> {
  const { url, init } = tokenRequest(config)
  const res = await fetch(url, init)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(describeZoomError(res.status, body))
  const token = (body as { access_token?: string }).access_token
  if (!token) throw new Error('الزوم ما رجّع توكن')
  return token
}

async function zoom(token: string, method: string, path: string, payload?: unknown): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${ZOOM_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  })
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { message: text }
  }
  return { status: res.status, body }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, configured: false, message: 'POST فقط' }, 405)

  if (!(await isAdminCaller(req))) {
    return json({ ok: false, configured: false, message: 'غير مسموح' }, 401)
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const action = String(body.action ?? 'status')
  const config = readZoomConfig((name) => Deno.env.get(name))

  if (action === 'status') {
    return json({ ok: true, configured: !!config, message: config ? 'مفاتيح الزوم موجودة' : 'مفاتيح الزوم ناقصة بأسرار Supabase' })
  }
  if (!config) {
    return json({ ok: false, configured: false, message: 'مفاتيح الزوم ناقصة بأسرار Supabase (ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET)' })
  }

  try {
    const token = await getAccessToken(config)

    switch (action) {
      case 'test': {
        const r = await zoom(token, 'GET', '/users/me')
        if (r.status >= 300) return json({ ok: false, configured: true, message: describeZoomError(r.status, r.body) })
        return json({ ok: true, configured: true, message: 'الزوم مربوط وشغال' })
      }
      case 'create': {
        const payload = buildMeetingPayload({
          start_time: String(body.start_time),
          duration: Number(body.duration) || 45,
          timezone: typeof body.timezone === 'string' ? body.timezone : undefined,
        })
        const r = await zoom(token, 'POST', '/users/me/meetings', payload)
        if (r.status >= 300) return json({ ok: false, configured: true, message: describeZoomError(r.status, r.body) })
        const meeting = parseMeeting(r.body)
        if (!meeting) return json({ ok: false, configured: true, message: 'رد الزوم ما فيه رابط اجتماع' })
        return json({ ok: true, configured: true, meeting })
      }
      case 'update': {
        const meetingId = String(body.meeting_id ?? '')
        if (!meetingId) return json({ ok: false, configured: true, message: 'رقم الاجتماع ناقص' })
        const payload = buildMeetingPayload({
          start_time: String(body.start_time),
          duration: Number(body.duration) || 45,
          timezone: typeof body.timezone === 'string' ? body.timezone : undefined,
        })
        const r = await zoom(token, 'PATCH', `/meetings/${encodeURIComponent(meetingId)}`, {
          start_time: payload.start_time,
          duration: payload.duration,
          timezone: payload.timezone,
        })
        if (r.status >= 300) return json({ ok: false, configured: true, message: describeZoomError(r.status, r.body) })
        return json({ ok: true, configured: true })
      }
      case 'delete': {
        const meetingId = String(body.meeting_id ?? '')
        if (!meetingId) return json({ ok: false, configured: true, message: 'رقم الاجتماع ناقص' })
        const r = await zoom(token, 'DELETE', `/meetings/${encodeURIComponent(meetingId)}?schedule_for_reminder=false`)
        if (r.status >= 300 && r.status !== 404) return json({ ok: false, configured: true, message: describeZoomError(r.status, r.body) })
        return json({ ok: true, configured: true })
      }
      default:
        return json({ ok: false, configured: true, message: `إجراء غير معروف: ${action}` }, 400)
    }
  } catch (err) {
    return json({ ok: false, configured: true, message: err instanceof Error ? err.message : 'خطأ غير متوقع' })
  }
})
