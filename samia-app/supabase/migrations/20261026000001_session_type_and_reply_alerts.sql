-- =============================================================================
-- 1) نوع الجلسة: زوم أو وجاهي، مع عنوان للجلسات الوجاهية
-- 2) إشعار فوري لسامية لما الزبون يرد (موافق / بدي أغيّر / ما بقدر أجي)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) الأعمدة
-- -----------------------------------------------------------------------------
alter table public.appointments
  add column if not exists session_type text not null default 'zoom'
    check (session_type in ('zoom', 'in_person')),
  add column if not exists location text;

-- عنوان العيادة: بيتعبى لحاله بكل جلسة وجاهية جديدة (وبينفع يتغيّر لموعد معيّن)
alter table public.settings
  add column if not exists clinic_address text;

-- -----------------------------------------------------------------------------
-- القوالب: سطر "مكان الجلسة" بعد سطر رابط الزوم.
-- السطر اللي قيمته فاضية بينشال لحاله، فالزوم بيطلع فيه الرابط بس، والوجاهي العنوان بس.
-- -----------------------------------------------------------------------------
update public.settings
set templates = (
  select coalesce(
    jsonb_object_agg(
      key,
      case
        when jsonb_typeof(value) = 'string'
             and position('{رابط_الجلسة}' in value #>> '{}') > 0
             and position('{مكان_الجلسة}' in value #>> '{}') = 0
        then to_jsonb(regexp_replace(
          value #>> '{}',
          E'([^\n]*\\{رابط_الجلسة\\}[^\n]*)',
          E'\\1\nمكان الجلسة: {مكان_الجلسة}'
        ))
        else value
      end
    ),
    '{}'::jsonb
  )
  from jsonb_each(templates)
);

-- -----------------------------------------------------------------------------
-- إنشاء موعد: نوع الجلسة والعنوان (اختياريين، فالنسخة القديمة من التطبيق بتضل شغالة)
-- -----------------------------------------------------------------------------
drop function if exists public.admin_create_appointment(uuid, timestamptz, int, boolean, text, text, text, text, numeric, text, text, jsonb);

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
  p_messages jsonb,
  p_session_type text default 'zoom',
  p_location text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_type text := coalesce(nullif(p_session_type, ''), 'zoom');
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if v_type not in ('zoom', 'in_person') then
    raise exception 'invalid_session_type' using errcode = '22023';
  end if;

  insert into public.appointments (
    client_id, starts_at, duration_min, has_companion, companion_name, companion_phone,
    session_type, location, meeting_url, zoom_meeting_id, price, admin_notes, public_token
  ) values (
    p_client_id, p_starts_at, p_duration_min, coalesce(p_has_companion, false),
    case when p_has_companion then p_companion_name end,
    case when p_has_companion then p_companion_phone end,
    v_type,
    case when v_type = 'in_person' then nullif(trim(coalesce(p_location, '')), '') end,
    case when v_type = 'zoom' then nullif(p_meeting_url, '') end,
    case when v_type = 'zoom' then nullif(p_zoom_meeting_id, '') end,
    p_price, nullif(p_admin_notes, ''),
    coalesce(nullif(p_public_token, ''), public.generate_public_token())
  ) returning id into v_id;

  perform public.insert_outbox_messages(v_id, p_messages);
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- تغيير موعد: بينفع يتغيّر النوع كمان (null = بيضل زي ما هو)
-- -----------------------------------------------------------------------------
drop function if exists public.admin_reschedule_appointment(uuid, timestamptz, int, text, text, jsonb);

create or replace function public.admin_reschedule_appointment(
  p_id uuid,
  p_starts_at timestamptz,
  p_duration_min int,
  p_meeting_url text,
  p_zoom_meeting_id text,
  p_messages jsonb,
  p_session_type text default null,
  p_location text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old public.appointments%rowtype;
  v_type text;
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

  v_type := coalesce(nullif(p_session_type, ''), v_old.session_type);
  if v_type not in ('zoom', 'in_person') then
    raise exception 'invalid_session_type' using errcode = '22023';
  end if;

  update public.appointments
  set starts_at = p_starts_at,
      duration_min = p_duration_min,
      previous_starts_at = v_old.starts_at,
      status = 'pending',
      responded_at = null,
      client_note = null,
      session_type = v_type,
      location = case
        when v_type = 'in_person' then coalesce(nullif(trim(coalesce(p_location, '')), ''), v_old.location)
      end,
      meeting_url = case
        when v_type = 'zoom' then coalesce(nullif(p_meeting_url, ''), case when v_old.session_type = 'zoom' then v_old.meeting_url end)
      end,
      zoom_meeting_id = case
        when v_type = 'zoom' then coalesce(nullif(p_zoom_meeting_id, ''), case when v_old.session_type = 'zoom' then v_old.zoom_meeting_id end)
      end
  where id = p_id;

  -- كل الرسائل غير المبعوتة القديمة بتنشال (دعوات وتذكيرات)
  delete from public.outbox_messages where appointment_id = p_id and sent_at is null;

  perform public.insert_outbox_messages(p_id, p_messages);
end;
$$;

revoke all on function public.admin_create_appointment(uuid, timestamptz, int, boolean, text, text, text, text, numeric, text, text, jsonb, text, text) from public, anon;
revoke all on function public.admin_reschedule_appointment(uuid, timestamptz, int, text, text, jsonb, text, text) from public, anon;
grant execute on function public.admin_create_appointment(uuid, timestamptz, int, boolean, text, text, text, text, numeric, text, text, jsonb, text, text) to authenticated;
grant execute on function public.admin_reschedule_appointment(uuid, timestamptz, int, text, text, jsonb, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- صفحة الزبون: نوع الجلسة والعنوان
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

  select a.starts_at, a.duration_min, a.status, a.meeting_url, a.session_type, a.location, c.full_name
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
    'session_type', r.session_type,
    'meeting_url', case when r.status = 'cancelled' or r.session_type <> 'zoom' then null else r.meeting_url end,
    'location', case when r.status = 'cancelled' or r.session_type <> 'in_person' then null else r.location end,
    'can_respond', (
      r.status in ('pending', 'confirmed', 'declined', 'change_requested')
      and r.starts_at > now()
    )
  );
end;
$$;

revoke all on function public.get_public_appointment(text) from public;
grant execute on function public.get_public_appointment(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2) إشعار لما الزبون يرد
-- notify-due بتبعت إشعار عن كل حدث من الزبون notified_at تبعه فاضي وبتعبّيه.
-- وعشان الإشعار يوصل خلال ثواني (مش لحد دورة المجدول الجاية)، كل رد بينادي الخدمة فوراً.
-- -----------------------------------------------------------------------------
alter table public.appointment_events
  add column if not exists notified_at timestamptz;

-- الردود القديمة ما بدها إشعار
update public.appointment_events set notified_at = now() where notified_at is null;

create index if not exists appointment_events_client_unnotified_idx
  on public.appointment_events (created_at)
  where actor = 'client' and notified_at is null;

create or replace function public.notify_on_client_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.actor = 'client' and new.type in ('status_changed', 'slot_taken') then
    begin
      perform public.invoke_notify_due();
    exception
      when others then
        null; -- رد الزبون أهم من الإشعار: أي مشكلة هون ما بتوقف الرد، والمجدول بيبعته بعد 5 دقايق
    end;
  end if;
  return new;
end;
$$;

revoke all on function public.notify_on_client_reply() from public, anon, authenticated;

drop trigger if exists appointment_events_notify_client_reply on public.appointment_events;
create trigger appointment_events_notify_client_reply
  after insert on public.appointment_events
  for each row execute function public.notify_on_client_reply();
