-- Users created before the on_auth_user_created trigger existed have no
-- profile, which breaks the matches -> profiles foreign keys. Backfill them,
-- and create any missing profile on the fly when a match references a user.

create function public.default_display_name(user_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'Player-' || substr(replace(user_id::text, '-', ''), 1, 4);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, public.default_display_name(new.id))
  on conflict (id) do nothing;
  return new;
end;
$$;

insert into public.profiles (id, display_name)
select u.id, public.default_display_name(u.id)
from auth.users u
on conflict (id) do nothing;

create function public.ensure_match_profiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  select u.id, public.default_display_name(u.id)
  from auth.users u
  where u.id in (new.host_id, new.guest_id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger matches_ensure_profiles
  before insert or update of host_id, guest_id on public.matches
  for each row execute function public.ensure_match_profiles();
