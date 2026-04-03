create table if not exists public.app_audit_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  category text not null,
  status text not null default 'success',
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists app_audit_events_profile_id_idx on public.app_audit_events(profile_id);
create index if not exists app_audit_events_created_at_idx on public.app_audit_events(created_at desc);

create table if not exists public.data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null,
  status text not null default 'requested',
  details text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_subject_requests_profile_id_idx on public.data_subject_requests(profile_id);
create index if not exists data_subject_requests_created_at_idx on public.data_subject_requests(created_at desc);
