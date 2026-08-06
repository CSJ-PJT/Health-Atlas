-- Health Atlas dashboard/auth hardening for authenticated web reads and Android writes.

create or replace function public.health_get_dashboard(p_limit integer default 30)
returns table (
  date text,
  synced_at timestamptz,
  steps numeric,
  active_calories numeric,
  activity_minutes numeric,
  resting_heart_rate numeric,
  sleep_hours numeric,
  weight_kg numeric,
  source text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 90);
begin
  return query
  select
    to_char(h.synced_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')::text,
    h.synced_at,
    case
      when trim(coalesce(h.steps_data ->> 'count', h.steps_data ->> 'steps', '')) ~ '^-?\d+(\.\d+)?$'
      then trim(coalesce(h.steps_data ->> 'count', h.steps_data ->> 'steps', ''))::numeric
      else null
    end,
    case
      when trim(coalesce(h.steps_data ->> 'calories', h.steps_data ->> 'activeCalories', '')) ~ '^-?\d+(\.\d+)?$'
      then trim(coalesce(h.steps_data ->> 'calories', h.steps_data ->> 'activeCalories', ''))::numeric
      else null
    end,
    case
      when trim(coalesce(h.exercise_data ->> 'movingMinutes', h.exercise_data ->> 'duration', h.steps_data ->> 'movingMinutes', '')) ~ '^-?\d+(\.\d+)?$'
      then trim(coalesce(h.exercise_data ->> 'movingMinutes', h.exercise_data ->> 'duration', h.steps_data ->> 'movingMinutes', ''))::numeric
      else null
    end,
    case
      when trim(coalesce(h.body_composition_data ->> 'restingHeartRate', h.body_composition_data ->> 'heartRate', '')) ~ '^-?\d+(\.\d+)?$'
      then trim(coalesce(h.body_composition_data ->> 'restingHeartRate', h.body_composition_data ->> 'heartRate', ''))::numeric
      else null
    end,
    case
      when trim(coalesce(h.sleep_data ->> 'totalMinutes', h.sleep_data ->> 'durationMinutes', h.sleep_data ->> 'sleepMinutes', '')) ~ '^-?\d+(\.\d+)?$'
      then trim(coalesce(h.sleep_data ->> 'totalMinutes', h.sleep_data ->> 'durationMinutes', h.sleep_data ->> 'sleepMinutes', ''))::numeric / 60.0
      else null
    end,
    case
      when trim(coalesce(h.body_composition_data ->> 'weightKg', h.body_composition_data ->> 'weight', '')) ~ '^-?\d+(\.\d+)?$'
      then trim(coalesce(h.body_composition_data ->> 'weightKg', h.body_composition_data ->> 'weight', ''))::numeric
      else null
    end,
    'health_data'::text
  from public.health_data as h
  where h.user_id = auth.uid()
    and h.synced_at is not null
  order by h.synced_at desc
  limit v_limit;
end;
$$;

alter table public.health_data enable row level security;

revoke all on table public.health_data from anon;
revoke all on table public.health_data from public;
revoke all on table public.health_data from authenticated;

drop policy if exists "allow_all_health_data" on public.health_data;
drop policy if exists "Users can view their own health data" on public.health_data;
drop policy if exists "Users can insert their own health data" on public.health_data;
drop policy if exists "Users can update their own health data" on public.health_data;
drop policy if exists "Users can delete their own health data" on public.health_data;
drop policy if exists "Service role can insert health data" on public.health_data;

create policy "health_data_select_owner"
on public.health_data
for select
to authenticated
using (auth.uid() = user_id);

-- Direct insert/update/delete remains blocked by default; writes should pass through
-- Edge Function + validation RPC where user ownership is fixed in server-side args.

revoke all on function public.health_get_dashboard(integer) from public;
revoke all on function public.health_get_dashboard(integer) from anon;
grant execute on function public.health_get_dashboard(integer) to authenticated;

create or replace function public.health_ingest_daily(
  p_user_id uuid,
  p_synced_at timestamptz,
  p_steps_data jsonb,
  p_exercise_data jsonb,
  p_running_data jsonb,
  p_sleep_data jsonb,
  p_body_composition_data jsonb,
  p_nutrition_data jsonb
)
returns table (ok boolean, health_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_id uuid;
begin
  if p_user_id is null then
    raise exception 'MISSING_USER';
  end if;

  if p_synced_at is null
    or p_synced_at > now() + interval '6 hours'
    or p_synced_at < now() - interval '400 days' then
    raise exception 'INVALID_SYNCED_AT';
  end if;

  if octet_length(coalesce(p_steps_data::text, '')) > 180000
    or octet_length(coalesce(p_exercise_data::text, '')) > 180000
    or octet_length(coalesce(p_running_data::text, '')) > 180000
    or octet_length(coalesce(p_sleep_data::text, '')) > 180000
    or octet_length(coalesce(p_body_composition_data::text, '')) > 180000
    or octet_length(coalesce(p_nutrition_data::text, '')) > 180000 then
    raise exception 'PAYLOAD_TOO_LARGE';
  end if;

  delete from public.health_data
  where user_id = p_user_id
    and date(synced_at AT TIME ZONE 'UTC') = date(p_synced_at AT TIME ZONE 'UTC');

  insert into public.health_data (
    user_id,
    synced_at,
    steps_data,
    exercise_data,
    running_data,
    sleep_data,
    body_composition_data,
    nutrition_data
  )
  values (
    p_user_id,
    p_synced_at,
    coalesce(p_steps_data, '{}'::jsonb),
    coalesce(p_exercise_data, '{}'::jsonb),
    coalesce(p_running_data, '{}'::jsonb),
    coalesce(p_sleep_data, '{}'::jsonb),
    coalesce(p_body_composition_data, '{}'::jsonb),
    coalesce(p_nutrition_data, '{}'::jsonb)
  )
  returning id into v_target_id;

  return query
  select true as ok, v_target_id as health_id;
end;
$$;

revoke all on function public.health_ingest_daily(uuid, timestamptz, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.health_ingest_daily(uuid, timestamptz, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from anon;
revoke all on function public.health_ingest_daily(uuid, timestamptz, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from authenticated;
grant execute on function public.health_ingest_daily(uuid, timestamptz, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to service_role;

-- Avoid exposing service-role style grants to browsers.
