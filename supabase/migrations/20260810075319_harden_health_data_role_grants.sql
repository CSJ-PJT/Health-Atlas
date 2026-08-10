revoke all privileges on table public.health_data from anon;
revoke all privileges on table public.health_data from authenticated;
grant select on table public.health_data to authenticated;
