create table if not exists public.user_profile_settings (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id text not null,
  nickname text not null,
  avatar_url text not null default '',
  bio text not null default '',
  show_summary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_profile_settings_profile_user_idx
  on public.user_profile_settings(profile_id, user_id);

create table if not exists public.user_earned_badges (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null,
  name text not null,
  description text not null,
  icon text not null,
  earned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_earned_badges_profile_badge_idx
  on public.user_earned_badges(profile_id, badge_id);

create table if not exists public.user_verified_records (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  record_type text not null,
  label text not null,
  official_time text not null,
  certified boolean not null default false,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_verified_records_profile_idx
  on public.user_verified_records(profile_id);

create table if not exists public.user_profile_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  display_record_type text not null default 'full',
  updated_at timestamptz not null default now()
);
