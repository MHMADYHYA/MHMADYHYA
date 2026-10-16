-- =============================================================================
-- مواعيد سامية يحيى: قاعدة البيانات الأساسية
-- الجداول: admins, clients, settings, appointments, appointment_events,
--          outbox_messages, push_subscriptions
-- + RLS على كل الجداول، دوال الإدارة الذرّية، ودالتي صفحة الزبون العامة.
-- كل الأوقات timestamptz (UTC) وبتنعرض بتوقيت Asia/Jerusalem بالواجهة.
-- =============================================================================

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- أنواع
-- -----------------------------------------------------------------------------
create type public.appointment_status as enum (
  'pending', 'confirmed', 'declined', 'change_requested', 'cancelled', 'attended', 'no_show'
);

create type public.payment_status as enum ('unpaid', 'paid', 'waived');

-- -----------------------------------------------------------------------------
-- admins: المستخدمين المسموح إلهم (سامية بس)
-- -----------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- أول مستخدم بينعمل بـ Supabase Auth بيصير المشرف تلقائياً (التسجيل الجديد مسكّر)
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins) then
    insert into public.admins (user_id) values (new.id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- دوال مساعدة
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 32 بايت عشوائية بصيغة base64url
create or replace function public.generate_public_token()
returns text
language sql
volatile
as $$
  select rtrim(translate(encode(gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
$$;

-- -----------------------------------------------------------------------------
-- clients: الزبائن
-- -----------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  phone text not null check (phone ~ '^[0-9]{8,15}$'),
  default_companion_name text,
  default_companion_phone text check (default_companion_phone is null or default_companion_phone ~ '^[0-9]{8,15}$'),
  default_price numeric(10, 2) check (default_price is null or default_price >= 0),
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_phone_idx on public.clients (phone);
create index clients_full_name_idx on public.clients (lower(full_name));

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- settings: صف واحد
-- -----------------------------------------------------------------------------
create table public.settings (
  id boolean primary key default true check (id),
  default_duration_min int not null default 45 check (default_duration_min between 5 and 480),
  reminder_day_hours int not null default 24 check (reminder_day_hours between 1 and 168),
  reminder_hour_minutes int not null default 60 check (reminder_hour_minutes between 5 and 1440),
  follow_up_after_hours int not null default 24 check (follow_up_after_hours between 1 and 336),
  fixed_meeting_url text,
  templates jsonb not null default '{}'::jsonb,
  public_base_url text,
  default_price numeric(10, 2) check (default_price is null or default_price >= 0),
  daily_summary_enabled boolean not null default true,
  daily_summary_time time not null default '08:00',
  daily_summary_last_sent_on date,
  timezone text not null default 'Asia/Jerusalem',
  updated_at timestamptz not null default now()
);

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

insert into public.settings (id, templates)
values (true, $templates${"invite_client":"مرحبا {الاسم}،\nتم تحديد جلسة إلك يوم {اليوم} {التاريخ} الساعة {الساعة}.\nرابط الجلسة (زوم): {رابط_الجلسة}\nالرجاء تأكيد الموعد من هون: {رابط_الرد}\nسامية يحيى","invite_companion":"مرحبا {اسم_المرافق}،\nتم تحديد جلسة لـ{الاسم} يوم {اليوم} {التاريخ} الساعة {الساعة}، وإنت مسجّل/ة كمرافق/ة.\nرابط الجلسة (زوم): {رابط_الجلسة}\nسامية يحيى","change_client":"مرحبا {الاسم}،\nتم تغيير موعد جلستك.\nالموعد القديم: يوم {اليوم_القديم} {التاريخ_القديم} الساعة {الساعة_القديمة}\nالموعد الجديد: يوم {اليوم} {التاريخ} الساعة {الساعة}\nرابط الجلسة (زوم): {رابط_الجلسة}\nالرجاء تأكيد الموعد الجديد من هون: {رابط_الرد}\nسامية يحيى","change_companion":"مرحبا {اسم_المرافق}،\nتم تغيير موعد جلسة {الاسم}.\nالموعد القديم: يوم {اليوم_القديم} {التاريخ_القديم} الساعة {الساعة_القديمة}\nالموعد الجديد: يوم {اليوم} {التاريخ} الساعة {الساعة}\nرابط الجلسة (زوم): {رابط_الجلسة}\nسامية يحيى","cancel_client":"مرحبا {الاسم}،\nبنعلمك إنو الجلسة يوم {اليوم} {التاريخ} الساعة {الساعة} انلغت.\n{السبب}\nسامية يحيى","cancel_companion":"مرحبا {اسم_المرافق}،\nبنعلمك إنو جلسة {الاسم} يوم {اليوم} {التاريخ} الساعة {الساعة} انلغت.\nسامية يحيى","reminder_day_client":"مرحبا {الاسم}،\nتذكير بجلستك يوم {اليوم} {التاريخ} الساعة {الساعة}.\nرابط الجلسة (زوم): {رابط_الجلسة}\nللتأكيد أو التغيير: {رابط_الرد}\nسامية يحيى","reminder_day_companion":"مرحبا {اسم_المرافق}،\nتذكير بجلسة {الاسم} يوم {اليوم} {التاريخ} الساعة {الساعة}.\nرابط الجلسة (زوم): {رابط_الجلسة}\nسامية يحيى","reminder_hour_client":"مرحبا {الاسم}،\nتذكير: جلستك اليوم الساعة {الساعة}.\nرابط الجلسة (زوم): {رابط_الجلسة}\nسامية يحيى","reminder_hour_companion":"مرحبا {اسم_المرافق}،\nتذكير: جلسة {الاسم} اليوم الساعة {الساعة}.\nرابط الجلسة (زوم): {رابط_الجلسة}\nسامية يحيى"}$templates$::jsonb);

-- -----------------------------------------------------------------------------
-- appointments: المواعيد
-- -----------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  starts_at timestamptz not null,
  duration_min int not null check (duration_min between 5 and 480),
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  has_companion boolean not null default false,
  companion_name text,
  companion_phone text check (companion_phone is null or companion_phone ~ '^[0-9]{8,15}$'),
  meeting_url text,
  zoom_meeting_id text,
  public_token text not null unique default public.generate_public_token(),
  client_note text,
  cancel_reason text,
  admin_notes text,
  previous_starts_at timestamptz,
  responded_at timestamptz,
  price numeric(10, 2) check (price is null or price >= 0),
  payment_status public.payment_status not null default 'unpaid',
  payment_method text check (payment_method is null or payment_method in ('cash', 'bit', 'transfer', 'other')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_companion_check check (
    not has_companion or (companion_name is not null and companion_phone is not null)
  ),
  -- منع تضارب المواعيد (الملغية والمرفوضة ما بتحجز وقت)
  constraint appointments_no_overlap exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status not in ('cancelled', 'declined'))
);

create index appointments_starts_at_idx on public.appointments (starts_at);
create index appointments_client_id_idx on public.appointments (client_id);
create index appointments_status_idx on public.appointments (status);

-- ends_at بينحسب دايماً من starts_at + duration_min
create or replace function public.appointments_before_write()
returns trigger
language plpgsql
as $$
begin
  new.ends_at := new.starts_at + make_interval(mins => new.duration_min);
  new.updated_at := now();
  if new.payment_status = 'paid' and new.paid_at is null then
    new.paid_at := now();
  end if;
  if new.payment_status <> 'paid' then
    new.paid_at := null;
    new.payment_method := null;
  end if;
  return new;
end;
$$;

create trigger appointments_before_write
  before insert or update on public.appointments
  for each row execute function public.appointments_before_write();

-- -----------------------------------------------------------------------------
-- appointment_events: سجل التغييرات
-- -----------------------------------------------------------------------------
create table public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  actor text not null check (actor in ('admin', 'client', 'system')),
  type text not null,
  from_status text,
  to_status text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index appointment_events_appointment_idx on public.appointment_events (appointment_id, created_at);

-- مين عمل التغيير: المشرف (مسجّل دخول)، الزبون (من الصفحة العامة)، أو النظام
create or replace function public.current_actor()
returns text
language plpgsql
stable
as $$
begin
  if coalesce(current_setting('app.actor', true), '') = 'client' then
    return 'client';
  end if;
  if auth.uid() is not null and public.is_admin() then
    return 'admin';
  end if;
  return 'system';
end;
$$;

-- كل تغيير مهم بالموعد بينسجّل تلقائياً
create or replace function public.log_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text := public.current_actor();
begin
  if tg_op = 'INSERT' then
    insert into public.appointment_events (appointment_id, actor, type, to_status, data)
    values (
      new.id, v_actor, 'created', new.status::text,
      jsonb_build_object('starts_at', new.starts_at, 'duration_min', new.duration_min)
    );
    return new;
  end if;

  if new.starts_at <> old.starts_at or new.duration_min <> old.duration_min then
    insert into public.appointment_events (appointment_id, actor, type, from_status, to_status, data)
    values (
      new.id, v_actor, 'rescheduled', old.status::text, new.status::text,
      jsonb_build_object(
        'from_starts_at', old.starts_at, 'to_starts_at', new.starts_at,
        'from_duration_min', old.duration_min, 'to_duration_min', new.duration_min
      )
    );
  elsif new.status <> old.status then
    insert into public.appointment_events (appointment_id, actor, type, from_status, to_status, data)
    values (
      new.id, v_actor,
      case when new.status = 'cancelled' then 'cancelled' else 'status_changed' end,
      old.status::text, new.status::text,
      jsonb_strip_nulls(jsonb_build_object(
        'client_note', case when new.status = 'change_requested' then new.client_note end,
        'cancel_reason', case when new.status = 'cancelled' then new.cancel_reason end
      ))
    );
  end if;

  if new.payment_status <> old.payment_status
     or new.price is distinct from old.price
     or new.payment_method is distinct from old.payment_method then
    insert into public.appointment_events (appointment_id, actor, type, data)
    values (
      new.id, v_actor, 'payment_changed',
      jsonb_strip_nulls(jsonb_build_object(
        'from_payment_status', old.payment_status::text, 'to_payment_status', new.payment_status::text,
        'from_price', old.price, 'to_price', new.price,
        'payment_method', new.payment_method
      ))
    );
  end if;

  return new;
end;
$$;

create trigger appointments_log_change
  after insert or update on public.appointments
  for each row execute function public.log_appointment_change();

-- -----------------------------------------------------------------------------
-- outbox_messages: الرسائل اللي لازم تنبعت
-- -----------------------------------------------------------------------------
create table public.outbox_messages (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  recipient text not null check (recipient in ('client', 'companion')),
  kind text not null check (kind in ('invite', 'change', 'cancel', 'reminder_day', 'reminder_hour')),
  to_phone text not null check (to_phone ~ '^[0-9]{8,15}$'),
  body text not null,
  due_at timestamptz not null,
  sent_at timestamptz,
  notified_at timestamptz,
  skipped_at timestamptz,
  created_at timestamptz not null default now()
);

create index outbox_messages_due_idx on public.outbox_messages (due_at)
  where sent_at is null and skipped_at is null;
create index outbox_messages_appointment_idx on public.outbox_messages (appointment_id);

-- لما سامية تكبس "ابعت" بينسجّل بسجل الموعد
create or replace function public.log_message_sent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sent_at is not null and old.sent_at is null then
    insert into public.appointment_events (appointment_id, actor, type, data)
    values (
      new.appointment_id, public.current_actor(), 'message_sent',
      jsonb_build_object('kind', new.kind, 'recipient', new.recipient, 'to_phone', new.to_phone)
    );
  end if;
  return new;
end;
$$;

create trigger outbox_messages_log_sent
  after update on public.outbox_messages
  for each row execute function public.log_message_sent();

-- -----------------------------------------------------------------------------
-- push_subscriptions: اشتراكات التنبيهات
-- -----------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- الصلاحيات (RLS): كل الجداول للمشرف بس. anon ما بيقرأ أي جدول مباشرة.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'admins', 'clients', 'settings', 'appointments', 'appointment_events', 'outbox_messages', 'push_subscriptions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t || '_admin_all', t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- دوال الإدارة الذرّية (موعد + رسائل بعملية وحدة)
-- p_messages: مصفوفة JSON [{recipient, kind, to_phone, body, due_at}]
-- -----------------------------------------------------------------------------
create or replace function public.insert_outbox_messages(p_appointment_id uuid, p_messages jsonb)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.outbox_messages (appointment_id, recipient, kind, to_phone, body, due_at)
  select
    p_appointment_id,
    m ->> 'recipient',
    m ->> 'kind',
    m ->> 'to_phone',
    m ->> 'body',
    (m ->> 'due_at')::timestamptz
  from jsonb_array_elements(coalesce(p_messages, '[]'::jsonb)) as m;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.insert_outbox_messages(uuid, jsonb) from public, anon;

create or replace function public.admin_create_appointment(
  p_client_id uuid,
  p_starts_at timestamptz,
  p_duration_min int,
  p_has_companion boolean,
  p_companion_name text,
  p_companion_phone text,
  p_meeting_url text,
  p_zoom_meeting_id text,
  p_price numeric,
  p_admin_notes text,
  p_public_token text,
  p_messages jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  insert into public.appointments (
    client_id, starts_at, duration_min, has_companion, companion_name, companion_phone,
    meeting_url, zoom_meeting_id, price, admin_notes, public_token
  ) values (
    p_client_id, p_starts_at, p_duration_min, coalesce(p_has_companion, false),
    case when p_has_companion then p_companion_name end,
    case when p_has_companion then p_companion_phone end,
    nullif(p_meeting_url, ''), nullif(p_zoom_meeting_id, ''), p_price, nullif(p_admin_notes, ''),
    coalesce(nullif(p_public_token, ''), public.generate_public_token())
  ) returning id into v_id;

  perform public.insert_outbox_messages(v_id, p_messages);
  return v_id;
end;
$$;

create or replace function public.admin_reschedule_appointment(
  p_id uuid,
  p_starts_at timestamptz,
  p_duration_min int,
  p_meeting_url text,
  p_zoom_meeting_id text,
  p_messages jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old public.appointments%rowtype;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  select * into v_old from public.appointments where id = p_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_old.status = 'cancelled' then
    raise exception 'appointment_cancelled' using errcode = 'P0001';
  end if;
  if v_old.status in ('attended', 'no_show') then
    raise exception 'appointment_finished' using errcode = 'P0001';
  end if;

  update public.appointments
  set starts_at = p_starts_at,
      duration_min = p_duration_min,
      previous_starts_at = v_old.starts_at,
      status = 'pending',
      responded_at = null,
      client_note = null,
      meeting_url = coalesce(nullif(p_meeting_url, ''), meeting_url),
      zoom_meeting_id = coalesce(nullif(p_zoom_meeting_id, ''), zoom_meeting_id)
  where id = p_id;

  -- كل الرسائل غير المبعوتة القديمة بتنشال (دعوات وتذكيرات)
  delete from public.outbox_messages where appointment_id = p_id and sent_at is null;

  perform public.insert_outbox_messages(p_id, p_messages);
end;
$$;

create or replace function public.admin_cancel_appointment(
  p_id uuid,
  p_reason text,
  p_messages jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old public.appointments%rowtype;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  select * into v_old from public.appointments where id = p_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_old.status = 'cancelled' then
    return;
  end if;

  update public.appointments
  set status = 'cancelled',
      cancel_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = p_id;

  delete from public.outbox_messages where appointment_id = p_id and sent_at is null;

  perform public.insert_outbox_messages(p_id, p_messages);
end;
$$;

revoke all on function public.admin_create_appointment(uuid, timestamptz, int, boolean, text, text, text, text, numeric, text, text, jsonb) from public, anon;
revoke all on function public.admin_reschedule_appointment(uuid, timestamptz, int, text, text, jsonb) from public, anon;
revoke all on function public.admin_cancel_appointment(uuid, text, jsonb) from public, anon;
grant execute on function public.admin_create_appointment(uuid, timestamptz, int, boolean, text, text, text, text, numeric, text, text, jsonb) to authenticated;
grant execute on function public.admin_reschedule_appointment(uuid, timestamptz, int, text, text, jsonb) to authenticated;
grant execute on function public.admin_cancel_appointment(uuid, text, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- صفحة الزبون العامة (القسم 8): دالتين security definer مسموحات لـ anon
-- ما بترجع أي معلومة عن الزبون غير الاسم الأول
-- -----------------------------------------------------------------------------
create or replace function public.get_public_appointment(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r record;
begin
  if p_token is null or length(p_token) < 20 then
    return null;
  end if;

  select a.starts_at, a.duration_min, a.status, a.meeting_url, c.full_name
  into r
  from public.appointments a
  join public.clients c on c.id = a.client_id
  where a.public_token = p_token;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'first_name', split_part(trim(r.full_name), ' ', 1),
    'starts_at', r.starts_at,
    'duration_min', r.duration_min,
    'status', r.status,
    'meeting_url', case when r.status = 'cancelled' then null else r.meeting_url end,
    'can_respond', (
      r.status in ('pending', 'confirmed', 'declined', 'change_requested')
      and r.starts_at > now()
    )
  );
end;
$$;

create or replace function public.respond_to_appointment(p_token text, p_action text, p_note text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_appt public.appointments%rowtype;
  v_new public.appointment_status;
  v_note text := nullif(trim(coalesce(left(p_note, 500), '')), '');
begin
  if p_action not in ('confirm', 'change', 'decline') then
    return jsonb_build_object('ok', false, 'error', 'invalid_action');
  end if;

  if p_token is null or length(p_token) < 20 then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_appt from public.appointments where public_token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_appt.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'error', 'cancelled');
  end if;
  if v_appt.starts_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if v_appt.status not in ('pending', 'confirmed', 'declined', 'change_requested') then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;

  v_new := case p_action
    when 'confirm' then 'confirmed'::public.appointment_status
    when 'change' then 'change_requested'::public.appointment_status
    else 'declined'::public.appointment_status
  end;

  perform set_config('app.actor', 'client', true);

  begin
    update public.appointments
    set status = v_new,
        responded_at = now(),
        client_note = case when p_action = 'change' then v_note else null end
    where id = v_appt.id;
  exception
    when exclusion_violation then
      -- الزبون كان رافض، سامية حجزت الوقت لحدا ثاني، وهلأ بده يوافق: الوقت ما عاد متاح.
      -- الحالة بتضل "رافض" (أي حالة ثانية بتحجز الوقت)، ومنسجّل ملاحظة وحدث عشان سامية تشوفه بالمتابعة.
      update public.appointments
      set responded_at = now(),
          client_note = 'حاول/ت يوافق بس الوقت انحجز لحدا ثاني'
      where id = v_appt.id;
      insert into public.appointment_events (appointment_id, actor, type, from_status, to_status, data)
      values (v_appt.id, 'client', 'slot_taken', v_appt.status::text, v_appt.status::text, jsonb_build_object('action', p_action));
      return jsonb_build_object('ok', false, 'error', 'slot_taken');
  end;

  return jsonb_build_object('ok', true) || public.get_public_appointment(p_token);
end;
$$;

revoke all on function public.get_public_appointment(text) from public;
revoke all on function public.respond_to_appointment(text, text, text) from public;
grant execute on function public.get_public_appointment(text) to anon, authenticated;
grant execute on function public.respond_to_appointment(text, text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Realtime: عشان الواجهة تتحدث لحالها لما الزبون يرد
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.appointments;
    alter publication supabase_realtime add table public.outbox_messages;
  end if;
end;
$$;
