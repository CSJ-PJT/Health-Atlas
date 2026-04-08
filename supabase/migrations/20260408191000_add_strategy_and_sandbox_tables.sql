create table if not exists public.entertainment_strategy_matches (
  id text primary key,
  room_id text not null,
  profile_id uuid,
  game_id text not null default 'pulse-frontier',
  mode text not null default 'strategy',
  status text not null default 'lobby',
  current_turn integer not null default 1,
  current_user_turn text,
  winner_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entertainment_strategy_events (
  id text primary key,
  match_id text not null,
  room_id text not null,
  user_id text,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.entertainment_strategy_snapshots (
  id text primary key,
  match_id text not null,
  version integer not null default 1,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.entertainment_strategy_season_scores (
  id text primary key,
  user_id text not null,
  wins integer not null default 0,
  losses integer not null default 0,
  rating integer not null default 1000,
  capture_points integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.entertainment_worlds (
  id text primary key,
  owner_user_id text not null,
  title text not null,
  theme text not null default '포레스트',
  visibility text not null default 'public',
  public_editable boolean not null default false,
  likes_count integer not null default 0,
  visits_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entertainment_world_snapshots (
  id text primary key,
  world_id text not null,
  version integer not null default 1,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.entertainment_world_events (
  id text primary key,
  world_id text not null,
  user_id text not null,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.entertainment_world_reactions (
  id text primary key,
  world_id text not null,
  user_id text not null,
  reaction_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.entertainment_world_permissions (
  id text primary key,
  world_id text not null,
  user_id text not null,
  role text not null,
  created_at timestamptz not null default now()
);
