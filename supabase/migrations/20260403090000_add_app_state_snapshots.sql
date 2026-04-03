create table if not exists public.app_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  scope_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, scope_key)
);

create index if not exists app_state_snapshots_profile_id_idx
  on public.app_state_snapshots(profile_id);

create index if not exists app_state_snapshots_scope_key_idx
  on public.app_state_snapshots(scope_key);
