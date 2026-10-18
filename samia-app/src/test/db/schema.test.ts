import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_TEMPLATES } from '../../lib/templates'
import { TestDb } from './harness'

let db: TestDb
let adminId: string
let clientId: string

async function createClient(name: string, phone: string) {
  const rows = await db.asAdmin<{ id: string }>(
    adminId,
    `insert into clients (full_name, phone) values ($1, $2) returning id`,
    [name, phone],
  )
  return rows[0].id
}

async function createAppointment(startsAt: string, durationMin = 45, extra: Record<string, unknown> = {}) {
  const rows = await db.asAdmin<{ admin_create_appointment: string }>(
    adminId,
    `select admin_create_appointment($1, $2::timestamptz, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)`,
    [
      extra.client_id ?? clientId,
      startsAt,
      durationMin,
      extra.has_companion ?? false,
      extra.companion_name ?? null,
      extra.companion_phone ?? null,
      extra.meeting_url ?? 'https://zoom.us/j/123',
      extra.zoom_meeting_id ?? null,
      extra.price ?? 200,
      extra.admin_notes ?? null,
      extra.public_token ?? null,
      JSON.stringify(extra.messages ?? []),
    ],
  )
  return rows[0].admin_create_appointment
}

beforeAll(async () => {
  db = await TestDb.create()
  adminId = await db.createAuthUser('samia@example.com')
  clientId = await createClient('ليلى حسن', '972501234567')
}, 60_000)

afterAll(async () => {
  await db?.close()
})

describe('المشرفين والصلاحيات', () => {
  it('أول مستخدم بيصير مشرف تلقائياً، والثاني لا', async () => {
    const secondId = await db.createAuthUser('someone@example.com')
    const admins = await db.root<{ user_id: string }>(`select user_id from admins`)
    expect(admins.map((a) => a.user_id)).toEqual([adminId])
    await expect(db.asAdmin(secondId, `select * from clients`)).resolves.toEqual([])
  })

  it('الإعدادات صف واحد فيه القوالب الافتراضية نفسها الموجودة بالكود', async () => {
    const rows = await db.asAdmin<{ templates: Record<string, string>; default_duration_min: number }>(
      adminId,
      `select templates, default_duration_min from settings`,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].default_duration_min).toBe(45)
    expect(rows[0].templates).toEqual(DEFAULT_TEMPLATES)
    await expect(db.asAdmin(adminId, `insert into settings (id) values (false)`)).rejects.toThrow()
  })

  it('anon ما بيقدر يقرأ أي جدول مباشرة', async () => {
    for (const table of [
      'admins',
      'clients',
      'settings',
      'appointments',
      'appointment_events',
      'outbox_messages',
      'push_subscriptions',
    ]) {
      await expect(db.asAnon(`select * from ${table}`)).rejects.toThrow(/permission denied/)
    }
  })

  it('مستخدم مسجّل بس مش مشرف ما بيشوف ولا بيكتب إشي', async () => {
    const strangerId = await db.createAuthUser('stranger@example.com')
    await expect(db.asAdmin(strangerId, `select * from appointments`)).resolves.toEqual([])
    await expect(
      db.asAdmin(strangerId, `insert into clients (full_name, phone) values ('x', '972500000000')`),
    ).rejects.toThrow(/row-level security/)
  })
})

describe('المواعيد', () => {
  it('ends_at بينحسب من المدة، والتوكن طويل وعشوائي، وبينسجّل حدث created', async () => {
    const id = await createAppointment('2030-01-10T08:00:00Z', 45)
    const [a] = await db.asAdmin<{ ends_at: string; public_token: string; status: string }>(
      adminId,
      `select ends_at, public_token, status from appointments where id = $1`,
      [id],
    )
    expect(new Date(a.ends_at).toISOString()).toBe('2030-01-10T08:45:00.000Z')
    expect(a.public_token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(a.status).toBe('pending')
    const events = await db.asAdmin<{ type: string; actor: string }>(
      adminId,
      `select type, actor from appointment_events where appointment_id = $1`,
      [id],
    )
    expect(events).toEqual([{ type: 'created', actor: 'admin' }])
  })

  it('منع تضارب المواعيد، إلا مع الملغي والمرفوض', async () => {
    await createAppointment('2030-02-01T08:00:00Z', 45)
    await expect(createAppointment('2030-02-01T08:30:00Z', 45)).rejects.toThrow(/appointments_no_overlap/)
    // بعده مباشرة مسموح (النهاية مفتوحة)
    await expect(createAppointment('2030-02-01T08:45:00Z', 45)).resolves.toBeTruthy()

    const cancelledId = await createAppointment('2030-02-02T08:00:00Z', 45)
    await db.asAdmin(adminId, `select admin_cancel_appointment($1, 'سبب', '[]'::jsonb)`, [cancelledId])
    await expect(createAppointment('2030-02-02T08:00:00Z', 45)).resolves.toBeTruthy()
  })

  it('الرسائل بتنعمل مع الموعد بعملية وحدة، وإذا فشل الموعد ما بتنحفظ رسائل', async () => {
    const before = await db.root<{ n: number }>(`select count(*)::int as n from outbox_messages`)
    const messages = [
      { recipient: 'client', kind: 'invite', to_phone: '972501234567', body: 'مرحبا', due_at: '2030-01-01T00:00:00Z' },
      { recipient: 'client', kind: 'reminder_day', to_phone: '972501234567', body: 'تذكير', due_at: '2030-03-01T08:00:00Z' },
    ]
    const id = await createAppointment('2030-03-02T08:00:00Z', 45, { messages })
    const rows = await db.asAdmin<{ kind: string }>(
      adminId,
      `select kind from outbox_messages where appointment_id = $1 order by due_at`,
      [id],
    )
    expect(rows.map((r) => r.kind)).toEqual(['invite', 'reminder_day'])

    // تضارب → ما في موعد ولا رسائل جديدة
    await expect(createAppointment('2030-03-02T08:10:00Z', 45, { messages })).rejects.toThrow()
    const after = await db.root<{ n: number }>(`select count(*)::int as n from outbox_messages`)
    expect(after[0].n).toBe(before[0].n + 2)
  })

  it('تغيير الموعد: الحالة بترجع بانتظار رد، الوقت القديم بينحفظ، والرسائل غير المبعوتة بتنشال', async () => {
    const id = await createAppointment('2030-04-01T08:00:00Z', 45, {
      messages: [
        { recipient: 'client', kind: 'invite', to_phone: '972501234567', body: 'دعوة', due_at: '2030-01-01T00:00:00Z' },
        { recipient: 'client', kind: 'reminder_day', to_phone: '972501234567', body: 'تذكير', due_at: '2030-03-31T08:00:00Z' },
      ],
    })
    // الدعوة انبعتت، التذكير لا
    await db.asAdmin(adminId, `update outbox_messages set sent_at = now() where appointment_id = $1 and kind = 'invite'`, [id])
    await db.asAdmin(adminId, `update appointments set status = 'confirmed' where id = $1`, [id])

    await db.asAdmin(
      adminId,
      `select admin_reschedule_appointment($1, '2030-04-02T10:00:00Z', 60, null, null, $2::jsonb)`,
      [
        id,
        JSON.stringify([
          { recipient: 'client', kind: 'change', to_phone: '972501234567', body: 'تغيير', due_at: '2030-01-01T00:00:00Z' },
        ]),
      ],
    )
    const [a] = await db.asAdmin<{ status: string; previous_starts_at: string; starts_at: string; duration_min: number }>(
      adminId,
      `select status, previous_starts_at, starts_at, duration_min from appointments where id = $1`,
      [id],
    )
    expect(a.status).toBe('pending')
    expect(new Date(a.previous_starts_at).toISOString()).toBe('2030-04-01T08:00:00.000Z')
    expect(new Date(a.starts_at).toISOString()).toBe('2030-04-02T10:00:00.000Z')
    expect(a.duration_min).toBe(60)

    const msgs = await db.asAdmin<{ kind: string; sent_at: string | null }>(
      adminId,
      `select kind, sent_at from outbox_messages where appointment_id = $1 order by created_at`,
      [id],
    )
    expect(msgs.map((m) => m.kind)).toEqual(['invite', 'change'])
    expect(msgs[0].sent_at).not.toBeNull()

    const events = await db.asAdmin<{ type: string; from_status: string | null; to_status: string | null }>(
      adminId,
      `select type, from_status, to_status from appointment_events where appointment_id = $1 order by created_at`,
      [id],
    )
    expect(events.map((e) => e.type)).toEqual(['created', 'message_sent', 'status_changed', 'rescheduled'])
    expect(events[3]).toMatchObject({ from_status: 'confirmed', to_status: 'pending' })
  })

  it('الإلغاء بيسجّل السبب وبيشيل الرسائل غير المبعوتة وبيضيف رسالة الإلغاء', async () => {
    const id = await createAppointment('2030-05-01T08:00:00Z', 45, {
      messages: [
        { recipient: 'client', kind: 'reminder_day', to_phone: '972501234567', body: 'تذكير', due_at: '2030-04-30T08:00:00Z' },
      ],
    })
    await db.asAdmin(
      adminId,
      `select admin_cancel_appointment($1, 'مرض', $2::jsonb)`,
      [id, JSON.stringify([{ recipient: 'client', kind: 'cancel', to_phone: '972501234567', body: 'إلغاء', due_at: '2030-01-01T00:00:00Z' }])],
    )
    const [a] = await db.asAdmin<{ status: string; cancel_reason: string }>(
      adminId,
      `select status, cancel_reason from appointments where id = $1`,
      [id],
    )
    expect(a).toEqual({ status: 'cancelled', cancel_reason: 'مرض' })
    const msgs = await db.asAdmin<{ kind: string }>(adminId, `select kind from outbox_messages where appointment_id = $1`, [id])
    expect(msgs.map((m) => m.kind)).toEqual(['cancel'])
    const events = await db.asAdmin<{ type: string; data: { cancel_reason?: string } }>(
      adminId,
      `select type, data from appointment_events where appointment_id = $1 order by created_at desc limit 1`,
      [id],
    )
    expect(events[0].type).toBe('cancelled')
    expect(events[0].data.cancel_reason).toBe('مرض')
    // تغيير موعد ملغي ممنوع
    await expect(
      db.asAdmin(adminId, `select admin_reschedule_appointment($1, '2030-05-03T08:00:00Z', 45, null, null, '[]'::jsonb)`, [id]),
    ).rejects.toThrow(/appointment_cancelled/)
  })

  it('الدفع: paid_at بينحط لحاله، وبينمسح لما يرجع unpaid، والتغيير بينسجّل', async () => {
    const id = await createAppointment('2030-06-01T08:00:00Z')
    await db.asAdmin(adminId, `update appointments set status = 'attended' where id = $1`, [id])
    await db.asAdmin(adminId, `update appointments set payment_status = 'paid', payment_method = 'bit' where id = $1`, [id])
    let [a] = await db.asAdmin<{ paid_at: string | null; payment_method: string | null }>(
      adminId,
      `select paid_at, payment_method from appointments where id = $1`,
      [id],
    )
    expect(a.paid_at).not.toBeNull()
    expect(a.payment_method).toBe('bit')

    await db.asAdmin(adminId, `update appointments set payment_status = 'unpaid' where id = $1`, [id])
    ;[a] = await db.asAdmin(adminId, `select paid_at, payment_method from appointments where id = $1`, [id])
    expect(a.paid_at).toBeNull()
    expect(a.payment_method).toBeNull()

    const events = await db.asAdmin<{ type: string }>(
      adminId,
      `select type from appointment_events where appointment_id = $1 order by created_at`,
      [id],
    )
    expect(events.map((e) => e.type)).toEqual(['created', 'status_changed', 'payment_changed', 'payment_changed'])
  })

  it('تنبيه بداية الجلسة: الإعداد الافتراضي نص ساعة، وتغيير الوقت بيرجّع التنبيه، وغير هيك لا', async () => {
    const [s] = await db.asAdmin<{ session_alert_minutes: number }>(adminId, `select session_alert_minutes from settings`)
    expect(s.session_alert_minutes).toBe(30)

    const id = await createAppointment('2030-07-01T08:00:00Z')
    const read = async () =>
      (await db.asAdmin<{ start_alert_sent_at: string | null }>(adminId, `select start_alert_sent_at from appointments where id = $1`, [id]))[0]
        .start_alert_sent_at
    expect(await read()).toBeNull()

    await db.asAdmin(adminId, `update appointments set start_alert_sent_at = now() where id = $1`, [id])
    await db.asAdmin(adminId, `update appointments set status = 'confirmed', admin_notes = 'x' where id = $1`, [id])
    expect(await read()).not.toBeNull()

    await db.asAdmin(adminId, `update appointments set starts_at = '2030-07-01T10:00:00Z' where id = $1`, [id])
    expect(await read()).toBeNull()

    const events = await db.asAdmin<{ type: string }>(
      adminId,
      `select type from appointment_events where appointment_id = $1 order by created_at`,
      [id],
    )
    // تسجيل التنبيه نفسه ما بيعمل أحداث بسجل الموعد
    expect(events.map((e) => e.type)).toEqual(['created', 'status_changed', 'rescheduled'])
  })

  it('رقم تلفون مش صالح بينرفض من قاعدة البيانات', async () => {
    await expect(createClient('x', '050-1234567')).rejects.toThrow(/clients_phone_check/)
    await expect(createClient('x', '+972501234567')).rejects.toThrow(/clients_phone_check/)
  })
})

describe('صفحة الزبون العامة', () => {
  it('توكن غلط بيرجع null وما بيكشف إشي', async () => {
    const rows = await db.asAnon<{ get_public_appointment: unknown }>(`select get_public_appointment('wrong-token-wrong-token-wrong')`)
    expect(rows[0].get_public_appointment).toBeNull()
    const short = await db.asAnon<{ get_public_appointment: unknown }>(`select get_public_appointment('abc')`)
    expect(short[0].get_public_appointment).toBeNull()
  })

  it('توكن صحيح بيرجع الاسم الأول بس والموعد ورابط الزوم', async () => {
    const token = 'tok_' + 'a'.repeat(39)
    await createAppointment('2030-07-01T08:00:00Z', 45, { public_token: token })
    const [row] = await db.asAnon<{ get_public_appointment: Record<string, unknown> }>(
      `select get_public_appointment($1)`,
      [token],
    )
    const info = row.get_public_appointment
    expect(info.first_name).toBe('ليلى')
    expect(info.status).toBe('pending')
    expect(info.meeting_url).toBe('https://zoom.us/j/123')
    expect(info.can_respond).toBe(true)
    expect(info.duration_min).toBe(45)
    expect(Object.keys(info).sort()).toEqual(['can_respond', 'duration_min', 'first_name', 'meeting_url', 'starts_at', 'status'])
  })

  it('الزبون بيقدر يوافق ويغيّر رده، وبينسجّل كـ client', async () => {
    const token = 'tok_' + 'b'.repeat(39)
    const id = await createAppointment('2030-08-01T08:00:00Z', 45, { public_token: token })

    const [r1] = await db.asAnon<{ respond_to_appointment: Record<string, unknown> }>(
      `select respond_to_appointment($1, 'confirm', null)`,
      [token],
    )
    expect(r1.respond_to_appointment.ok).toBe(true)
    expect(r1.respond_to_appointment.status).toBe('confirmed')

    const [r2] = await db.asAnon<{ respond_to_appointment: Record<string, unknown> }>(
      `select respond_to_appointment($1, 'change', $2)`,
      [token, 'بعد الظهر أحسن'],
    )
    expect(r2.respond_to_appointment.status).toBe('change_requested')

    const [a] = await db.root<{ client_note: string; responded_at: string | null }>(
      `select client_note, responded_at from appointments where id = $1`,
      [id],
    )
    expect(a.client_note).toBe('بعد الظهر أحسن')
    expect(a.responded_at).not.toBeNull()

    const events = await db.root<{ actor: string; from_status: string; to_status: string; data: { client_note?: string } }>(
      `select actor, from_status, to_status, data from appointment_events where appointment_id = $1 and type = 'status_changed' order by created_at`,
      [id],
    )
    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({ actor: 'client', from_status: 'pending', to_status: 'confirmed' })
    expect(events[1]).toMatchObject({ actor: 'client', from_status: 'confirmed', to_status: 'change_requested' })
    expect(events[1].data.client_note).toBe('بعد الظهر أحسن')

    const [r3] = await db.asAnon<{ respond_to_appointment: Record<string, unknown> }>(
      `select respond_to_appointment($1, 'decline', null)`,
      [token],
    )
    expect(r3.respond_to_appointment.status).toBe('declined')
  })

  it('الزبون ما بيقدر يرد على موعد ملغي أو مرق وقته أو توكن غلط أو إجراء غلط', async () => {
    const cancelledToken = 'tok_' + 'c'.repeat(39)
    const cancelledId = await createAppointment('2030-09-01T08:00:00Z', 45, { public_token: cancelledToken })
    await db.asAdmin(adminId, `select admin_cancel_appointment($1, null, '[]'::jsonb)`, [cancelledId])
    let [r] = await db.asAnon<{ respond_to_appointment: Record<string, unknown> }>(
      `select respond_to_appointment($1, 'confirm', null)`,
      [cancelledToken],
    )
    expect(r.respond_to_appointment).toEqual({ ok: false, error: 'cancelled' })
    const [info] = await db.asAnon<{ get_public_appointment: Record<string, unknown> }>(
      `select get_public_appointment($1)`,
      [cancelledToken],
    )
    expect(info.get_public_appointment.meeting_url).toBeNull()
    expect(info.get_public_appointment.can_respond).toBe(false)

    const pastToken = 'tok_' + 'd'.repeat(39)
    await createAppointment('2020-01-01T08:00:00Z', 45, { public_token: pastToken })
    ;[r] = await db.asAnon(`select respond_to_appointment($1, 'confirm', null)`, [pastToken])
    expect(r.respond_to_appointment).toEqual({ ok: false, error: 'expired' })

    ;[r] = await db.asAnon(`select respond_to_appointment('nope-nope-nope-nope-nope', 'confirm', null)`)
    expect(r.respond_to_appointment).toEqual({ ok: false, error: 'not_found' })

    ;[r] = await db.asAnon(`select respond_to_appointment($1, 'delete', null)`, [pastToken])
    expect(r.respond_to_appointment).toEqual({ ok: false, error: 'invalid_action' })
  })

  it('رافض بده يوافق بعد ما انحجز الوقت لحدا ثاني → slot_taken وطلب تغيير', async () => {
    const token = 'tok_' + 'e'.repeat(39)
    const id = await createAppointment('2030-10-01T08:00:00Z', 45, { public_token: token })
    await db.asAnon(`select respond_to_appointment($1, 'decline', null)`, [token])
    // الوقت تحرّر، سامية حجزته لزبون ثاني
    const otherClient = await createClient('زبون ثاني', '972509999999')
    await createAppointment('2030-10-01T08:00:00Z', 45, { client_id: otherClient })
    const [r] = await db.asAnon<{ respond_to_appointment: Record<string, unknown> }>(
      `select respond_to_appointment($1, 'confirm', null)`,
      [token],
    )
    expect(r.respond_to_appointment).toEqual({ ok: false, error: 'slot_taken' })
    const [a] = await db.root<{ status: string; client_note: string }>(`select status, client_note from appointments where id = $1`, [id])
    expect(a.status).toBe('declined')
    expect(a.client_note).toContain('انحجز')
    const events = await db.root<{ type: string; actor: string }>(
      `select type, actor from appointment_events where appointment_id = $1 order by created_at desc limit 1`,
      [id],
    )
    expect(events[0]).toEqual({ type: 'slot_taken', actor: 'client' })
  })

  it('ما في تغيير وقت لجلسة خلصت (حضر / ما حضر)', async () => {
    const id = await createAppointment('2030-11-01T08:00:00Z')
    await db.asAdmin(adminId, `update appointments set status = 'attended' where id = $1`, [id])
    await expect(
      db.asAdmin(adminId, `select admin_reschedule_appointment($1, '2030-11-02T08:00:00Z', 45, null, null, '[]'::jsonb)`, [id]),
    ).rejects.toThrow(/appointment_finished/)
  })

  it('anon ما بيقدر ينادي دوال الإدارة', async () => {
    await expect(db.asAnon(`select admin_cancel_appointment(gen_random_uuid(), null, '[]'::jsonb)`)).rejects.toThrow(
      /permission denied/,
    )
  })
})
