alter table public.entertainment_challenges enable row level security;
alter table public.entertainment_scores enable row level security;
alter table public.entertainment_score_events enable row level security;
alter table public.entertainment_rooms enable row level security;
alter table public.entertainment_strategy_matches enable row level security;
alter table public.entertainment_strategy_events enable row level security;
alter table public.entertainment_strategy_snapshots enable row level security;
alter table public.entertainment_strategy_season_scores enable row level security;
alter table public.entertainment_worlds enable row level security;
alter table public.entertainment_world_snapshots enable row level security;
alter table public.entertainment_world_events enable row level security;
alter table public.entertainment_world_reactions enable row level security;
alter table public.entertainment_world_permissions enable row level security;

drop policy if exists "Entertainment challenges baseline select" on public.entertainment_challenges;
drop policy if exists "Entertainment challenges baseline insert" on public.entertainment_challenges;
drop policy if exists "Entertainment challenges baseline update" on public.entertainment_challenges;
drop policy if exists "Entertainment challenges baseline delete" on public.entertainment_challenges;

create policy "Entertainment challenges baseline select"
  on public.entertainment_challenges for select
  using (true);

create policy "Entertainment challenges baseline insert"
  on public.entertainment_challenges for insert
  with check (true);

create policy "Entertainment challenges baseline update"
  on public.entertainment_challenges for update
  using (true)
  with check (true);

create policy "Entertainment challenges baseline delete"
  on public.entertainment_challenges for delete
  using (true);

drop policy if exists "Entertainment scores baseline select" on public.entertainment_scores;
drop policy if exists "Entertainment scores baseline insert" on public.entertainment_scores;
drop policy if exists "Entertainment scores baseline update" on public.entertainment_scores;
drop policy if exists "Entertainment scores baseline delete" on public.entertainment_scores;

create policy "Entertainment scores baseline select"
  on public.entertainment_scores for select
  using (true);

create policy "Entertainment scores baseline insert"
  on public.entertainment_scores for insert
  with check (true);

create policy "Entertainment scores baseline update"
  on public.entertainment_scores for update
  using (true)
  with check (true);

create policy "Entertainment scores baseline delete"
  on public.entertainment_scores for delete
  using (true);

drop policy if exists "Entertainment score events baseline select" on public.entertainment_score_events;
drop policy if exists "Entertainment score events baseline insert" on public.entertainment_score_events;

create policy "Entertainment score events baseline select"
  on public.entertainment_score_events for select
  using (true);

create policy "Entertainment score events baseline insert"
  on public.entertainment_score_events for insert
  with check (true);

drop policy if exists "Entertainment rooms baseline select" on public.entertainment_rooms;
drop policy if exists "Entertainment rooms baseline insert" on public.entertainment_rooms;
drop policy if exists "Entertainment rooms baseline update" on public.entertainment_rooms;
drop policy if exists "Entertainment rooms baseline delete" on public.entertainment_rooms;

create policy "Entertainment rooms baseline select"
  on public.entertainment_rooms for select
  using (true);

create policy "Entertainment rooms baseline insert"
  on public.entertainment_rooms for insert
  with check (true);

create policy "Entertainment rooms baseline update"
  on public.entertainment_rooms for update
  using (true)
  with check (true);

create policy "Entertainment rooms baseline delete"
  on public.entertainment_rooms for delete
  using (true);

drop policy if exists "Strategy matches baseline select" on public.entertainment_strategy_matches;
drop policy if exists "Strategy matches baseline insert" on public.entertainment_strategy_matches;
drop policy if exists "Strategy matches baseline update" on public.entertainment_strategy_matches;

create policy "Strategy matches baseline select"
  on public.entertainment_strategy_matches for select
  using (true);

create policy "Strategy matches baseline insert"
  on public.entertainment_strategy_matches for insert
  with check (true);

create policy "Strategy matches baseline update"
  on public.entertainment_strategy_matches for update
  using (true)
  with check (true);

drop policy if exists "Strategy events baseline select" on public.entertainment_strategy_events;
drop policy if exists "Strategy events baseline insert" on public.entertainment_strategy_events;

create policy "Strategy events baseline select"
  on public.entertainment_strategy_events for select
  using (true);

create policy "Strategy events baseline insert"
  on public.entertainment_strategy_events for insert
  with check (true);

drop policy if exists "Strategy snapshots baseline select" on public.entertainment_strategy_snapshots;
drop policy if exists "Strategy snapshots baseline insert" on public.entertainment_strategy_snapshots;
drop policy if exists "Strategy snapshots baseline update" on public.entertainment_strategy_snapshots;

create policy "Strategy snapshots baseline select"
  on public.entertainment_strategy_snapshots for select
  using (true);

create policy "Strategy snapshots baseline insert"
  on public.entertainment_strategy_snapshots for insert
  with check (true);

create policy "Strategy snapshots baseline update"
  on public.entertainment_strategy_snapshots for update
  using (true)
  with check (true);

drop policy if exists "Strategy season scores baseline select" on public.entertainment_strategy_season_scores;
drop policy if exists "Strategy season scores baseline insert" on public.entertainment_strategy_season_scores;
drop policy if exists "Strategy season scores baseline update" on public.entertainment_strategy_season_scores;

create policy "Strategy season scores baseline select"
  on public.entertainment_strategy_season_scores for select
  using (true);

create policy "Strategy season scores baseline insert"
  on public.entertainment_strategy_season_scores for insert
  with check (true);

create policy "Strategy season scores baseline update"
  on public.entertainment_strategy_season_scores for update
  using (true)
  with check (true);

drop policy if exists "Worlds baseline select" on public.entertainment_worlds;
drop policy if exists "Worlds baseline insert" on public.entertainment_worlds;
drop policy if exists "Worlds baseline update" on public.entertainment_worlds;

create policy "Worlds baseline select"
  on public.entertainment_worlds for select
  using (true);

create policy "Worlds baseline insert"
  on public.entertainment_worlds for insert
  with check (true);

create policy "Worlds baseline update"
  on public.entertainment_worlds for update
  using (true)
  with check (true);

drop policy if exists "World snapshots baseline select" on public.entertainment_world_snapshots;
drop policy if exists "World snapshots baseline insert" on public.entertainment_world_snapshots;
drop policy if exists "World snapshots baseline update" on public.entertainment_world_snapshots;

create policy "World snapshots baseline select"
  on public.entertainment_world_snapshots for select
  using (true);

create policy "World snapshots baseline insert"
  on public.entertainment_world_snapshots for insert
  with check (true);

create policy "World snapshots baseline update"
  on public.entertainment_world_snapshots for update
  using (true)
  with check (true);

drop policy if exists "World events baseline select" on public.entertainment_world_events;
drop policy if exists "World events baseline insert" on public.entertainment_world_events;

create policy "World events baseline select"
  on public.entertainment_world_events for select
  using (true);

create policy "World events baseline insert"
  on public.entertainment_world_events for insert
  with check (true);

drop policy if exists "World reactions baseline select" on public.entertainment_world_reactions;
drop policy if exists "World reactions baseline insert" on public.entertainment_world_reactions;
drop policy if exists "World reactions baseline delete" on public.entertainment_world_reactions;

create policy "World reactions baseline select"
  on public.entertainment_world_reactions for select
  using (true);

create policy "World reactions baseline insert"
  on public.entertainment_world_reactions for insert
  with check (true);

create policy "World reactions baseline delete"
  on public.entertainment_world_reactions for delete
  using (true);

drop policy if exists "World permissions baseline select" on public.entertainment_world_permissions;
drop policy if exists "World permissions baseline insert" on public.entertainment_world_permissions;
drop policy if exists "World permissions baseline update" on public.entertainment_world_permissions;
drop policy if exists "World permissions baseline delete" on public.entertainment_world_permissions;

create policy "World permissions baseline select"
  on public.entertainment_world_permissions for select
  using (true);

create policy "World permissions baseline insert"
  on public.entertainment_world_permissions for insert
  with check (true);

create policy "World permissions baseline update"
  on public.entertainment_world_permissions for update
  using (true)
  with check (true);

create policy "World permissions baseline delete"
  on public.entertainment_world_permissions for delete
  using (true);
