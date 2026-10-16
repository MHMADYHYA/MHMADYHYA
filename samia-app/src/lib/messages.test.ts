import { describe, expect, it } from 'vitest'
import { buildMessages, buildTemplateVars, firstName, reminderDueTimes, responseLink } from './messages'
import { DEFAULT_TEMPLATES } from './templates'

const settings = {
  templates: DEFAULT_TEMPLATES,
  reminder_day_hours: 24,
  reminder_hour_minutes: 60,
  public_base_url: 'https://mawaeed.example.com/',
}

const client = { full_name: 'ليلى حسن محمود', phone: '972501234567' }

const appointment = {
  starts_at: '2026-10-20T07:00:00Z', // الثلاثاء 20/10/2026 الساعة 10:00
  meeting_url: 'https://zoom.us/j/111',
  public_token: 'tok_abc',
  has_companion: false,
  companion_name: null,
  companion_phone: null,
}

describe('متغيرات القالب', () => {
  it('الاسم الأول ورابط الرد والتاريخ بالعربي', () => {
    expect(firstName('ليلى حسن محمود')).toBe('ليلى')
    expect(firstName('  ليلى ')).toBe('ليلى')
    expect(responseLink('https://x.com/', 't')).toBe('https://x.com/a/t')
    expect(responseLink(null, 't')).toBe(`${window.location.origin}/a/t`)
    expect(responseLink('', 't')).toBe(`${window.location.origin}/a/t`)
    const vars = buildTemplateVars(appointment, client, settings)
    expect(vars).toMatchObject({
      الاسم: 'ليلى',
      اسم_المرافق: '',
      اليوم: 'الثلاثاء',
      التاريخ: '20/10/2026',
      الساعة: '10:00',
      اليوم_القديم: '',
      رابط_الجلسة: 'https://zoom.us/j/111',
      رابط_الرد: 'https://mawaeed.example.com/a/tok_abc',
      السبب: '',
    })
  })
})

describe('رسائل موعد جديد', () => {
  it('دعوة هلأ + تذكير قبل بيوم + تذكير قبل بساعة', () => {
    const now = new Date('2026-10-15T08:00:00Z')
    const drafts = buildMessages('invite', appointment, client, settings, now)
    expect(drafts.map((d) => [d.recipient, d.kind, d.due_at])).toEqual([
      ['client', 'invite', now.toISOString()],
      ['client', 'reminder_day', '2026-10-19T07:00:00.000Z'],
      ['client', 'reminder_hour', '2026-10-20T06:00:00.000Z'],
    ])
    expect(drafts[0].to_phone).toBe('972501234567')
    expect(drafts[0].body).toContain('مرحبا ليلى،')
    expect(drafts[0].body).toContain('يوم الثلاثاء 20/10/2026 الساعة 10:00')
    expect(drafts[0].body).toContain('https://mawaeed.example.com/a/tok_abc')
    expect(drafts[2].body).toBe(
      'مرحبا ليلى،\nتذكير: جلستك اليوم الساعة 10:00.\nرابط الجلسة (زوم): https://zoom.us/j/111\nسامية يحيى',
    )
  })

  it('مع مرافق: نسخة لكل رسالة', () => {
    const now = new Date('2026-10-15T08:00:00Z')
    const drafts = buildMessages(
      'invite',
      { ...appointment, has_companion: true, companion_name: 'أم ليلى', companion_phone: '972521111111' },
      client,
      settings,
      now,
    )
    expect(drafts.map((d) => `${d.kind}/${d.recipient}`)).toEqual([
      'invite/client',
      'invite/companion',
      'reminder_day/client',
      'reminder_day/companion',
      'reminder_hour/client',
      'reminder_hour/companion',
    ])
    const companionInvite = drafts[1]
    expect(companionInvite.to_phone).toBe('972521111111')
    expect(companionInvite.body).toContain('مرحبا أم ليلى،')
    expect(companionInvite.body).toContain('جلسة لـليلى')
    expect(companionInvite.body).not.toContain('/a/tok_abc')
  })

  it('التذكير بينعمل بس إذا وقته لسا ما إجا', () => {
    const now = new Date('2026-10-19T12:00:00Z') // أقل من 24 ساعة قبل الموعد
    const drafts = buildMessages('invite', appointment, client, settings, now)
    expect(drafts.map((d) => d.kind)).toEqual(['invite', 'reminder_hour'])

    const later = new Date('2026-10-20T06:30:00Z')
    expect(buildMessages('invite', appointment, client, settings, later).map((d) => d.kind)).toEqual(['invite'])
  })

  it('بدون رابط زوم: سطر الرابط بينشال', () => {
    const drafts = buildMessages('invite', { ...appointment, meeting_url: null }, client, settings, new Date('2026-10-01T00:00:00Z'))
    expect(drafts[0].body).not.toContain('رابط الجلسة')
    expect(drafts[0].body).toContain('الرجاء تأكيد الموعد')
  })

  it('أوقات التذكير بتتبع الإعدادات', () => {
    const due = reminderDueTimes(appointment.starts_at, { ...settings, reminder_day_hours: 48, reminder_hour_minutes: 30 })
    expect(due.day.toISOString()).toBe('2026-10-18T07:00:00.000Z')
    expect(due.hour.toISOString()).toBe('2026-10-20T06:30:00.000Z')
  })
})

describe('رسائل التغيير والإلغاء', () => {
  it('التغيير فيه القديم والجديد + تذكيرات جديدة', () => {
    const now = new Date('2026-10-15T08:00:00Z')
    const drafts = buildMessages(
      'change',
      { ...appointment, previous_starts_at: '2026-10-18T13:00:00Z' },
      client,
      settings,
      now,
    )
    expect(drafts.map((d) => d.kind)).toEqual(['change', 'reminder_day', 'reminder_hour'])
    expect(drafts[0].body).toContain('الموعد القديم: يوم الأحد 18/10/2026 الساعة 16:00')
    expect(drafts[0].body).toContain('الموعد الجديد: يوم الثلاثاء 20/10/2026 الساعة 10:00')
  })

  it('الإلغاء مع سبب وبدون، وبدون تذكيرات', () => {
    const now = new Date('2026-10-15T08:00:00Z')
    const withReason = buildMessages('cancel', { ...appointment, cancel_reason: 'ظرف طارئ' }, client, settings, now)
    expect(withReason.map((d) => d.kind)).toEqual(['cancel'])
    expect(withReason[0].body.split('\n')).toEqual([
      'مرحبا ليلى،',
      'بنعلمك إنو الجلسة يوم الثلاثاء 20/10/2026 الساعة 10:00 انلغت.',
      'ظرف طارئ',
      'سامية يحيى',
    ])
    const noReason = buildMessages('cancel', { ...appointment, cancel_reason: '  ' }, client, settings, now)
    expect(noReason[0].body.split('\n')).toHaveLength(3)
  })

  it('قالب مخصص من الإعدادات بينستعمل', () => {
    const custom = { ...settings, templates: { invite_client: 'أهلاً {الاسم}' } }
    const drafts = buildMessages('invite', appointment, client, custom, new Date('2026-10-20T06:30:00Z'))
    expect(drafts[0].body).toBe('أهلاً ليلى')
  })
})
