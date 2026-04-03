create table if not exists public.entertainment_challenges (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  details text not null default '',
  reward text not null default '',
  icon text not null default 'run',
  progress integer not null default 0,
  joined_user_ids text[] not null default '{}',
  completed_user_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entertainment_challenges_profile_idx
  on public.entertainment_challenges(profile_id, created_at desc);

create table if not exists public.entertainment_scores (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null,
  best_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists entertainment_scores_profile_game_uidx
  on public.entertainment_scores(profile_id, game_id);

create table if not exists public.entertainment_rooms (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  host_id text not null,
  host_name text not null,
  game_id text not null,
  duration_seconds integer not null default 30,
  team_mode boolean not null default false,
  participants jsonb not null default '[]'::jsonb,
  chat jsonb not null default '[]'::jsonb,
  max_players integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entertainment_rooms_profile_idx
  on public.entertainment_rooms(profile_id, created_at desc);

