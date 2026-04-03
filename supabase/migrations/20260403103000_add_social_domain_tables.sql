create table if not exists public.social_feed_posts (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  author_id text not null,
  author_name text not null,
  content text not null default '',
  media jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_feed_posts_profile_id_idx on public.social_feed_posts(profile_id);
create index if not exists social_feed_posts_created_at_idx on public.social_feed_posts(created_at desc);

create table if not exists public.social_feed_comments (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  post_id text not null,
  author_id text not null,
  author_name text not null,
  parent_id text null,
  content text not null,
  liked_user_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_feed_comments_profile_id_idx on public.social_feed_comments(profile_id);
create index if not exists social_feed_comments_post_id_idx on public.social_feed_comments(post_id);

create table if not exists public.social_friends (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  phone text not null default '',
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_friends_profile_id_idx on public.social_friends(profile_id);

create table if not exists public.social_chat_rooms (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text not null,
  member_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_chat_rooms_profile_id_idx on public.social_chat_rooms(profile_id);

create table if not exists public.social_chat_messages (
  id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  room_id text not null,
  sender_id text not null,
  sender_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists social_chat_messages_profile_id_idx on public.social_chat_messages(profile_id);
create index if not exists social_chat_messages_room_id_idx on public.social_chat_messages(room_id);
