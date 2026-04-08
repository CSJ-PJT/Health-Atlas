alter table public.entertainment_rooms
  add column if not exists room_rules jsonb default '{}'::jsonb;
