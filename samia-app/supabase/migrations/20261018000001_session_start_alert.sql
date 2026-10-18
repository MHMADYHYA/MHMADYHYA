-- =============================================================================
-- تنبيه لسامية قبل بداية كل جلسة (افتراضي نص ساعة).
-- خدمة notify-due (كل 5 دقايق) بتلاقي الجلسات اللي بتبلّش خلال session_alert_minutes
-- وما انبعت عنها تنبيه، بتبعت "عندك جلسة الساعة 16:00، بعد نص ساعة" وبتسجّل start_alert_sent_at.
-- =============================================================================

-- كم دقيقة قبل الجلسة بيوصل التنبيه. 0 = مطفي.
alter table public.settings
  add column if not exists session_alert_minutes int not null default 30
  check (session_alert_minutes between 0 and 1440);

-- إمتى انبعت تنبيه البداية لهاي الجلسة (null = لسا ما انبعت)
alter table public.appointments
  add column if not exists start_alert_sent_at timestamptz;

-- إذا تغيّر وقت الجلسة، التنبيه لازم ينبعت من جديد على الوقت الجديد
create or replace function public.appointments_reset_start_alert()
returns trigger
language plpgsql
as $$
begin
  if new.starts_at is distinct from old.starts_at then
    new.start_alert_sent_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_reset_start_alert on public.appointments;
create trigger appointments_reset_start_alert
  before update of starts_at on public.appointments
  for each row execute function public.appointments_reset_start_alert();

create index if not exists appointments_start_alert_idx
  on public.appointments (starts_at)
  where start_alert_sent_at is null;
