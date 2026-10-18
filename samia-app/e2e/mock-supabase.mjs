/**
 * محاكاة خفيفة لـ Supabase (Auth + PostgREST + RPC + Functions) جوا Playwright.
 * الهدف: فتح كل شاشات التطبيق ببيانات تجريبية بدون مشروع Supabase حقيقي.
 * مش بديل عن الاختبارات الحقيقية على قاعدة البيانات (src/test/db).
 */
import { randomUUID } from 'node:crypto'

const TZ_OFFSET_HOURS = 3 // تقريب كافي للبيانات التجريبية (صيفي)

function at(dayOffset, hour, minute = 0) {
  const d = new Date()
  d.setUTCHours(hour - TZ_OFFSET_HOURS, minute, 0, 0)
  d.setUTCDate(d.getUTCDate() + dayOffset)
  return d.toISOString()
}

function plusMinutes(iso, min) {
  return new Date(new Date(iso).getTime() + min * 60_000).toISOString()
}

export function createMockDb() {
  const now = new Date().toISOString()
  const clients = [
    { id: randomUUID(), full_name: 'ليلى حسن', phone: '972501234567', default_companion_name: 'أم ليلى', default_companion_phone: '972521111111', default_price: 200, notes: 'بتفضّل المواعيد الصباحية', archived: false, created_at: now, updated_at: now },
    { id: randomUUID(), full_name: 'محمد خالد', phone: '972549876543', default_companion_name: null, default_companion_phone: null, default_price: null, notes: null, archived: false, created_at: now, updated_at: now },
    { id: randomUUID(), full_name: 'رنا سعيد', phone: '972507654321', default_companion_name: null, default_companion_phone: null, default_price: 250, notes: null, archived: false, created_at: now, updated_at: now },
    { id: randomUUID(), full_name: 'يوسف عمر', phone: '972523334444', default_companion_name: null, default_companion_phone: null, default_price: null, notes: null, archived: true, created_at: now, updated_at: now },
  ]
  const [laila, mohammad, rana] = clients

  const appointments = []
  const outbox = []
  const events = []

  function addAppointment(partial) {
    const a = {
      id: randomUUID(),
      duration_min: 45,
      status: 'pending',
      has_companion: false,
      companion_name: null,
      companion_phone: null,
      meeting_url: 'https://zoom.us/j/1234567890?pwd=demo',
      zoom_meeting_id: '1234567890',
      public_token: 'demo_' + randomUUID().replace(/-/g, ''),
      client_note: null,
      cancel_reason: null,
      admin_notes: null,
      previous_starts_at: null,
      responded_at: null,
      price: 200,
      payment_status: 'unpaid',
      payment_method: null,
      paid_at: null,
      start_alert_sent_at: null,
      created_at: now,
      updated_at: now,
      ...partial,
    }
    a.ends_at = plusMinutes(a.starts_at, a.duration_min)
    appointments.push(a)
    events.push({ id: randomUUID(), appointment_id: a.id, actor: 'admin', type: 'created', from_status: null, to_status: a.status, data: {}, created_at: a.created_at })
    return a
  }

  function addMessage(a, recipient, kind, dueAt, extra = {}) {
    outbox.push({
      id: randomUUID(),
      appointment_id: a.id,
      recipient,
      kind,
      to_phone: recipient === 'client' ? clients.find((c) => c.id === a.client_id).phone : a.companion_phone,
      body: `مرحبا ${recipient === 'client' ? 'ليلى' : 'أم ليلى'}،\nتذكير بجلستك.\nرابط الجلسة (زوم): ${a.meeting_url}\nسامية يحيى`,
      due_at: dueAt,
      sent_at: null,
      notified_at: null,
      skipped_at: null,
      created_at: now,
      ...extra,
    })
  }

  // اليوم
  const a1 = addAppointment({ client_id: laila.id, starts_at: at(0, 10), status: 'confirmed', has_companion: true, companion_name: 'أم ليلى', companion_phone: '972521111111', responded_at: at(-1, 12) })
  const a2 = addAppointment({ client_id: mohammad.id, starts_at: at(0, 12), status: 'pending' })
  const a3 = addAppointment({ client_id: rana.id, starts_at: at(0, 16), status: 'change_requested', client_note: 'بعد الظهر أحسن إلي', responded_at: at(0, 8), price: 250 })
  // بكرا وبعده
  const a4 = addAppointment({ client_id: laila.id, starts_at: at(1, 11), status: 'pending', has_companion: true, companion_name: 'أم ليلى', companion_phone: '972521111111' })
  addAppointment({ client_id: mohammad.id, starts_at: at(2, 9), status: 'declined', responded_at: at(0, 7) })
  addAppointment({ client_id: rana.id, starts_at: at(3, 14), status: 'confirmed', price: 250 })
  addAppointment({ client_id: laila.id, starts_at: at(5, 10), status: 'cancelled', cancel_reason: 'سفر' })
  // الماضي
  const p1 = addAppointment({ client_id: laila.id, starts_at: at(-2, 10), status: 'attended' })
  const p2 = addAppointment({ client_id: mohammad.id, starts_at: at(-3, 12), status: 'no_show', price: 150 })
  addAppointment({ client_id: rana.id, starts_at: at(-7, 16), status: 'attended', payment_status: 'paid', payment_method: 'bit', paid_at: at(-6, 9), price: 250 })
  addAppointment({ client_id: laila.id, starts_at: at(-9, 10), status: 'attended', payment_status: 'paid', payment_method: 'cash', paid_at: at(-9, 11) })
  addAppointment({ client_id: mohammad.id, starts_at: at(-1, 13), status: 'confirmed' }) // مرق وما انعلّم

  addMessage(a1, 'client', 'reminder_hour', plusMinutes(a1.starts_at, -60))
  addMessage(a1, 'companion', 'reminder_hour', plusMinutes(a1.starts_at, -60))
  addMessage(a2, 'client', 'invite', at(-1, 9), { sent_at: at(-1, 9) })
  addMessage(a2, 'client', 'reminder_day', plusMinutes(a2.starts_at, -24 * 60))
  addMessage(a3, 'client', 'invite', at(-2, 9), { sent_at: at(-2, 9) })
  addMessage(a4, 'client', 'invite', now)
  addMessage(a4, 'companion', 'invite', now)
  addMessage(a4, 'client', 'reminder_day', plusMinutes(a4.starts_at, -24 * 60))
  addMessage(a4, 'client', 'reminder_hour', plusMinutes(a4.starts_at, -60))
  const cancelled = appointments.find((a) => a.status === 'cancelled')
  addMessage(cancelled, 'client', 'cancel', now)
  void p1
  void p2

  const settings = {
    id: true,
    default_duration_min: 45,
    reminder_day_hours: 24,
    reminder_hour_minutes: 60,
    follow_up_after_hours: 24,
    fixed_meeting_url: 'https://zoom.us/j/5550001111',
    templates: {},
    public_base_url: 'http://localhost:5173',
    default_price: 200,
    daily_summary_enabled: true,
    daily_summary_time: '08:00:00',
    daily_summary_last_sent_on: null,
    session_alert_minutes: 30,
    timezone: 'Asia/Jerusalem',
    updated_at: now,
  }

  const tables = { clients, appointments, outbox_messages: outbox, appointment_events: events, settings: [settings], push_subscriptions: [] }
  return { tables, user: { id: randomUUID(), email: 'samia@example.com' }, demoToken: a2.public_token }
}

// ---------------------------------------------------------------------------
// PostgREST صغير
// ---------------------------------------------------------------------------
function parseList(raw) {
  const inner = raw.replace(/^\(/, '').replace(/\)$/, '')
  return inner.split(',').map((s) => s.trim().replace(/^"|"$/g, ''))
}

function compare(a, b) {
  if (typeof a === 'number' || typeof b === 'number') return Number(a) - Number(b)
  return String(a).localeCompare(String(b))
}

function matches(row, key, raw) {
  let negate = false
  let rest = raw
  if (rest.startsWith('not.')) {
    negate = true
    rest = rest.slice(4)
  }
  const dot = rest.indexOf('.')
  const op = rest.slice(0, dot)
  const value = rest.slice(dot + 1)
  const v = row[key]
  let result
  switch (op) {
    case 'eq':
      result = String(v) === value
      break
    case 'neq':
      result = String(v) !== value
      break
    case 'gt':
      result = v != null && compare(v, value) > 0
      break
    case 'gte':
      result = v != null && compare(v, value) >= 0
      break
    case 'lt':
      result = v != null && compare(v, value) < 0
      break
    case 'lte':
      result = v != null && compare(v, value) <= 0
      break
    case 'is':
      result = value === 'null' ? v == null : value === 'true' ? v === true : v === false
      break
    case 'in':
      result = parseList(value).includes(String(v))
      break
    default:
      result = true
  }
  return negate ? !result : result
}

function splitTopLevel(select) {
  const parts = []
  let depth = 0
  let cur = ''
  for (const ch of select) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

function pick(row, cols) {
  if (!row) return null
  if (cols.includes('*')) return { ...row }
  const out = {}
  for (const c of cols) if (c in row) out[c] = row[c]
  return out
}

function embed(tables, table, row, select) {
  const out = {}
  const parts = splitTopLevel(select || '*')
  const plainCols = []
  for (const part of parts) {
    const m = /^([a-z_]+)(!inner)?\((.*)\)$/s.exec(part)
    if (!m) {
      plainCols.push(part)
      continue
    }
    const rel = m[1]
    const inner = m[3]
    if (table === 'appointments' && rel === 'clients') {
      out.clients = embed(tables, 'clients', tables.clients.find((c) => c.id === row.client_id), inner)
    } else if (table === 'appointments' && rel === 'outbox_messages') {
      out.outbox_messages = tables.outbox_messages.filter((m2) => m2.appointment_id === row.id).map((m2) => embed(tables, 'outbox_messages', m2, inner))
    } else if (table === 'outbox_messages' && rel === 'appointments') {
      out.appointments = embed(tables, 'appointments', tables.appointments.find((a) => a.id === row.appointment_id), inner)
    }
  }
  return { ...pick(row, plainCols.length ? plainCols : ['*']), ...out }
}

function queryTable(tables, table, url) {
  let rows = [...tables[table]]
  const params = [...url.searchParams.entries()]
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key)) continue
    rows = rows.filter((r) => matches(r, key, raw))
  }
  const order = url.searchParams.get('order')
  if (order) {
    const [col, dir] = order.split(',')[0].split('.')
    rows.sort((a, b) => (dir === 'desc' ? -1 : 1) * compare(a[col], b[col]))
  }
  const limit = url.searchParams.get('limit')
  if (limit) rows = rows.slice(0, Number(limit))
  return rows
}

function logEvent(tables, appointmentId, type, from, to, data = {}) {
  tables.appointment_events.push({ id: randomUUID(), appointment_id: appointmentId, actor: 'admin', type, from_status: from, to_status: to, data, created_at: new Date().toISOString() })
}

function rpc(db, name, body) {
  const { tables } = db
  switch (name) {
    case 'is_admin':
      return true
    case 'admin_create_appointment': {
      const a = {
        id: randomUUID(),
        client_id: body.p_client_id,
        starts_at: new Date(body.p_starts_at).toISOString(),
        duration_min: body.p_duration_min,
        status: 'pending',
        has_companion: body.p_has_companion,
        companion_name: body.p_companion_name,
        companion_phone: body.p_companion_phone,
        meeting_url: body.p_meeting_url,
        zoom_meeting_id: body.p_zoom_meeting_id,
        public_token: body.p_public_token,
        client_note: null,
        cancel_reason: null,
        admin_notes: body.p_admin_notes,
        previous_starts_at: null,
        responded_at: null,
        price: body.p_price,
        payment_status: 'unpaid',
        payment_method: null,
        paid_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      a.ends_at = plusMinutes(a.starts_at, a.duration_min)
      tables.appointments.push(a)
      for (const m of body.p_messages ?? []) tables.outbox_messages.push({ id: randomUUID(), appointment_id: a.id, sent_at: null, notified_at: null, skipped_at: null, created_at: a.created_at, ...m })
      logEvent(tables, a.id, 'created', null, 'pending')
      return a.id
    }
    case 'admin_reschedule_appointment': {
      const a = tables.appointments.find((x) => x.id === body.p_id)
      const from = a.status
      a.previous_starts_at = a.starts_at
      a.starts_at = new Date(body.p_starts_at).toISOString()
      a.duration_min = body.p_duration_min
      a.ends_at = plusMinutes(a.starts_at, a.duration_min)
      a.status = 'pending'
      a.responded_at = null
      a.client_note = null
      tables.outbox_messages = tables.outbox_messages.filter((m) => !(m.appointment_id === a.id && !m.sent_at))
      for (const m of body.p_messages ?? []) tables.outbox_messages.push({ id: randomUUID(), appointment_id: a.id, sent_at: null, notified_at: null, skipped_at: null, created_at: new Date().toISOString(), ...m })
      logEvent(tables, a.id, 'rescheduled', from, 'pending', { from_starts_at: a.previous_starts_at, to_starts_at: a.starts_at })
      return null
    }
    case 'admin_cancel_appointment': {
      const a = tables.appointments.find((x) => x.id === body.p_id)
      const from = a.status
      a.status = 'cancelled'
      a.cancel_reason = body.p_reason
      tables.outbox_messages = tables.outbox_messages.filter((m) => !(m.appointment_id === a.id && !m.sent_at))
      for (const m of body.p_messages ?? []) tables.outbox_messages.push({ id: randomUUID(), appointment_id: a.id, sent_at: null, notified_at: null, skipped_at: null, created_at: new Date().toISOString(), ...m })
      logEvent(tables, a.id, 'cancelled', from, 'cancelled', { cancel_reason: a.cancel_reason })
      return null
    }
    case 'get_public_appointment': {
      const a = tables.appointments.find((x) => x.public_token === body.p_token)
      if (!a) return null
      const c = tables.clients.find((x) => x.id === a.client_id)
      return {
        first_name: c.full_name.split(' ')[0],
        starts_at: a.starts_at,
        duration_min: a.duration_min,
        status: a.status,
        meeting_url: a.status === 'cancelled' ? null : a.meeting_url,
        can_respond: !['cancelled', 'attended', 'no_show'].includes(a.status) && new Date(a.starts_at) > new Date(),
      }
    }
    case 'respond_to_appointment': {
      const a = tables.appointments.find((x) => x.public_token === body.p_token)
      if (!a) return { ok: false, error: 'not_found' }
      if (a.status === 'cancelled') return { ok: false, error: 'cancelled' }
      if (new Date(a.starts_at) <= new Date()) return { ok: false, error: 'expired' }
      const from = a.status
      a.status = body.p_action === 'confirm' ? 'confirmed' : body.p_action === 'change' ? 'change_requested' : 'declined'
      a.responded_at = new Date().toISOString()
      a.client_note = body.p_action === 'change' ? body.p_note : null
      tables.appointment_events.push({ id: randomUUID(), appointment_id: a.id, actor: 'client', type: 'status_changed', from_status: from, to_status: a.status, data: { client_note: a.client_note }, created_at: a.responded_at })
      return { ok: true, ...rpc(db, 'get_public_appointment', body) }
    }
    default:
      return null
  }
}

export async function installMockSupabase(page, db, baseUrl = 'https://demo.supabase.co') {
  const { tables, user } = db
  const authUser = { id: user.id, aud: 'authenticated', role: 'authenticated', email: user.email, app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() }
  const session = () => ({ access_token: 'demo-access-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'demo-refresh', user: authUser })

  const log = (...args) => {
    if (process.env.MOCK_LOG) console.log('[mock]', ...args)
  }
  if (typeof page.routeWebSocket === 'function') {
    await page.routeWebSocket(/realtime/, () => {})
  }
  await page.route(`${baseUrl}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const method = request.method()
    log(method, path + url.search.slice(0, 120))
    const reply = (body, status = 200, headers = {}) =>
      route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', ...headers }, body: body === undefined ? '' : JSON.stringify(body) })

    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
    if (path.startsWith('/realtime')) return route.abort()

    if (path.startsWith('/auth/v1/token')) {
      const body = request.postDataJSON?.() ?? {}
      if (body.password && body.password !== 'demo1234') return reply({ error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials', error_code: 'invalid_credentials' }, 400)
      return reply(session())
    }
    if (path === '/auth/v1/user') return reply(authUser)
    if (path === '/auth/v1/logout') return reply(undefined, 204)
    if (path.startsWith('/auth/v1/')) return reply({}, 200)

    if (path.startsWith('/functions/v1/')) {
      const name = path.split('/')[3]
      if (name === 'zoom-meeting') return reply({ ok: false, configured: false, message: 'وضع تجريبي: الزوم مش مربوط' })
      if (name === 'notify-due') return reply({ ok: true, sent: 1 })
      return reply({ ok: false }, 404)
    }

    if (path.startsWith('/rest/v1/rpc/')) {
      const name = path.split('/').pop()
      const body = request.postDataJSON?.() ?? {}
      return reply(rpc(db, name, body))
    }

    if (path.startsWith('/rest/v1/')) {
      try {
      const table = path.split('/')[3]
      if (!tables[table]) return reply({ message: `unknown table ${table}` }, 404)
      const wantsObject = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object')
      const select = url.searchParams.get('select') ?? '*'
      const respondRows = (rows) => {
        const shaped = rows.map((r) => embed(tables, table, r, select))
        if (wantsObject) return shaped.length ? reply(shaped[0]) : reply({ code: 'PGRST116', message: 'no rows', details: null, hint: null }, 406)
        return reply(shaped)
      }
      if (method === 'GET' || method === 'HEAD') return respondRows(queryTable(tables, table, url))
      if (method === 'PATCH') {
        const patch = request.postDataJSON?.() ?? {}
        const rows = queryTable(tables, table, url)
        for (const r of rows) {
          const before = { ...r }
          Object.assign(r, patch, { updated_at: new Date().toISOString() })
          if (table === 'appointments') {
            if (patch.status && patch.status !== before.status) logEvent(tables, r.id, 'status_changed', before.status, patch.status)
            if (patch.payment_status && patch.payment_status !== before.payment_status) {
              r.paid_at = patch.payment_status === 'paid' ? new Date().toISOString() : null
              if (patch.payment_status !== 'paid') r.payment_method = null
              logEvent(tables, r.id, 'payment_changed', null, null, { from_payment_status: before.payment_status, to_payment_status: patch.payment_status, payment_method: r.payment_method })
            }
          }
        }
        return respondRows(rows)
      }
      if (method === 'POST') {
        const body = request.postDataJSON?.() ?? {}
        const list = Array.isArray(body) ? body : [body]
        const created = list.map((item) => {
          const row = { id: randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), archived: false, ...item }
          tables[table].push(row)
          return row
        })
        return respondRows(created)
      }
      if (method === 'DELETE') {
        const rows = queryTable(tables, table, url)
        tables[table] = tables[table].filter((r) => !rows.includes(r))
        return respondRows(rows)
      }
      } catch (err) {
        console.log('[mock] ERROR', method, path, err?.stack ?? err)
        return reply({ message: String(err) }, 500)
      }
    }
    return reply({ message: 'not mocked' }, 404)
  })
}
