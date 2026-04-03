alter table public.user_profile_settings
  add column if not exists show_badges boolean not null default true,
  add column if not exists show_personal_feed boolean not null default true;

alter table public.social_feed_posts
  add column if not exists visibility text not null default 'public';
