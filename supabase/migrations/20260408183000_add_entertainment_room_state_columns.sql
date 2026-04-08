alter table public.entertainment_rooms
  add column if not exists room_mode text default 'arcade',
  add column if not exists room_status text default 'lobby',
  add column if not exists visibility text default 'public',
  add column if not exists editable_by text default 'host',
  add column if not exists game_state jsonb,
  add column if not exists system_events jsonb default '[]'::jsonb;
