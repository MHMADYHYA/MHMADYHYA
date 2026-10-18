/**
 * Edge Function: notify-due
 * بتنادى كل 5 دقايق من pg_cron (مع x-cron-secret)، أو من التطبيق (action: test) بحساب المشرف.
 * - بتلاقي الرسائل اللي وقتها إجا وما انبعتت وما انعمل عنها تنبيه ← تنبيه واحد "عندك n رسائل لازم تنبعت"
 * - قبل بداية كل جلسة بـ settings.session_alert_minutes (افتراضي نص ساعة) ← "عندك جلسة الساعة 16:00، بعد نص ساعة"
 * - ملخص الصبح مرة باليوم بالساعة اللي بالإعدادات (بتوقيت القدس)
 *
 * الأسرار: CRON_SECRET, VAPID_KEYS (JSON من npm run vapid), VAPID_CONTACT (إيميل، اختياري)
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush@0.5'
import {
  SESSION_ALERT_STATUSES,
  dailySummaryNotification,
  dueMessagesNotification,
  isSessionAlertDue,
  localDayRangeUtc,
  sessionStartingNotification,
  shouldSendDailySummary,
} from '../_shared/notify-core.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

interface PushRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

interface Payload {
  title: string
  body: string
  url: string
  tag: string
}

const REMINDER_KINDS = new Set(['reminder_day', 'reminder_hour'])
const REMINDER_STATUSES = new Set(['pending', 'confirmed'])

function messageApplies(kind: string, status: string): boolean {
  return REMINDER_KINDS.has(kind) ? REMINDER_STATUSES.has(status) : true
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, message: 'POST فقط' }, 405)

  const cronSecret = Deno.env.get('CRON_SECRET')
  const isCron = !!cronSecret && req.headers.get('x-cron-secret') === cronSecret
  if (!isCron && !(await isAdminCaller(req))) return json({ ok: false, message: 'غير مسموح' }, 401)

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const vapidRaw = Deno.env.get('VAPID_KEYS')
  if (!vapidRaw) return json({ ok: false, message: 'السر VAPID_KEYS مش موجود. شغّلي npm run vapid وحطي القيمة بأسرار Supabase.' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  let appServer: webpush.ApplicationServer
  try {
    const vapidKeys = await webpush.importVapidKeys(JSON.parse(vapidRaw), { extractable: false })
    appServer = await webpush.ApplicationServer.new({
      contactInformation: `mailto:${Deno.env.get('VAPID_CONTACT') ?? 'admin@example.com'}`,
      vapidKeys,
    })
  } catch (err) {
    return json({ ok: false, message: `مفاتيح VAPID مش صالحة: ${err instanceof Error ? err.message : String(err)}` })
  }

  const { data: subs, error: subsError } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth')
  if (subsError) return json({ ok: false, message: subsError.message }, 500)
  const subscriptions = (subs ?? []) as PushRow[]

  async function broadcast(payload: Payload): Promise<number> {
    let sent = 0
    for (const sub of subscriptions) {
      try {
        const subscriber = appServer.subscribe({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } })
        await subscriber.pushTextMessage(JSON.stringify(payload), {})
        sent++
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          console.error('push failed', sub.endpoint.slice(0, 40), err instanceof Error ? err.message : err)
        }
      }
    }
    return sent
  }

  if (body.action === 'test') {
    if (subscriptions.length === 0) return json({ ok: false, message: 'ما في أجهزة مشتركة بالتنبيهات بعد.' })
    const sent = await broadcast({ title: 'تجربة', body: 'التنبيهات شغالة على هاد الجهاز.', url: '/settings', tag: 'test' })
    return json({ ok: sent > 0, sent, message: sent > 0 ? undefined : 'ما قدرنا نبعت لأي جهاز.' })
  }

  const now = new Date()
  const nowIso = now.toISOString()

  // 1) رسائل وقتها إجا وما انعمل عنها تنبيه
  const { data: dueRows, error: dueError } = await admin
    .from('outbox_messages')
    .select('id, kind, appointments!inner(status)')
    .is('sent_at', null)
    .is('skipped_at', null)
    .is('notified_at', null)
    .lte('due_at', nowIso)
  if (dueError) return json({ ok: false, message: dueError.message }, 500)

  const due = (dueRows ?? []).filter((m) => messageApplies(m.kind as string, (m.appointments as { status: string }).status))
  let dueSent = 0
  if (due.length > 0 && subscriptions.length > 0) {
    const n = dueMessagesNotification(due.length)
    dueSent = await broadcast({ ...n, url: '/messages', tag: 'due-messages' })
    if (dueSent > 0) {
      await admin
        .from('outbox_messages')
        .update({ notified_at: nowIso })
        .in(
          'id',
          due.map((m) => m.id as string),
        )
    }
  }

  const { data: settings } = await admin.from('settings').select('*').eq('id', true).single()
  const tz = (settings?.timezone as string | undefined) || 'Asia/Jerusalem'

  // 2) تنبيه قبل بداية كل جلسة (settings.session_alert_minutes، افتراضي 30، و0 = مطفي)
  const alertMinutes = Number(settings?.session_alert_minutes ?? 30)
  let sessionAlerts = 0
  if (alertMinutes > 0 && subscriptions.length > 0) {
    const windowEnd = new Date(now.getTime() + alertMinutes * 60_000).toISOString()
    const { data: soonRows, error: soonError } = await admin
      .from('appointments')
      .select('id, starts_at')
      .in('status', [...SESSION_ALERT_STATUSES])
      .is('start_alert_sent_at', null)
      .gt('starts_at', nowIso)
      .lte('starts_at', windowEnd)
      .order('starts_at')
    if (soonError) console.error('session alerts query failed', soonError.message)
    for (const row of soonRows ?? []) {
      const startsAt = new Date(row.starts_at as string)
      if (!isSessionAlertDue(startsAt, now, alertMinutes)) continue
      const n = sessionStartingNotification(startsAt, now, tz)
      const sent = await broadcast({ ...n, url: `/appointments/${row.id}`, tag: `session-start-${row.id}` })
      if (sent > 0) {
        await admin.from('appointments').update({ start_alert_sent_at: nowIso }).eq('id', row.id as string)
        sessionAlerts++
      }
    }
  }

  // 3) ملخص الصبح
  let summarySent = false
  if (settings) {
    const decision = shouldSendDailySummary(settings, now)
    if (decision.send && subscriptions.length > 0) {
      const range = localDayRangeUtc(now, tz)
      const { count: sessions } = await admin
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .gte('starts_at', range.start.toISOString())
        .lt('starts_at', range.end.toISOString())
        .not('status', 'in', '("cancelled","declined")')
      const { data: pendingRows } = await admin
        .from('outbox_messages')
        .select('id, kind, appointments!inner(status)')
        .is('sent_at', null)
        .is('skipped_at', null)
        .lte('due_at', nowIso)
      const pending = (pendingRows ?? []).filter((m) => messageApplies(m.kind as string, (m.appointments as { status: string }).status)).length
      const n = dailySummaryNotification(sessions ?? 0, pending)
      const sent = await broadcast({ ...n, url: '/calendar', tag: 'daily-summary' })
      if (sent > 0) {
        await admin.from('settings').update({ daily_summary_last_sent_on: decision.today }).eq('id', true)
        summarySent = true
      }
    }
  }

  return json({ ok: true, due: due.length, dueSent, sessionAlerts, summarySent, devices: subscriptions.length })
})
