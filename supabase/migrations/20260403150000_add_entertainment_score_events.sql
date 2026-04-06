create table if not exists public.entertainment_score_events (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id text not null,
  player_name text not null,
  game_id text not null,
  score integer not null default 0,
  played_at timestamptz not null default now()
);

create index if not exists entertainment_score_events_game_idx
  on public.entertainment_score_events(game_id, played_at desc);

create index if not exists entertainment_score_events_profile_idx
  on public.entertainment_score_events(profile_id, played_at desc);

