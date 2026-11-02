-- Core schema for a 2-player realtime game.
--
-- Realtime model (hybrid):
--   * Fast, ephemeral updates (moves, cursors, "is typing") go over a private
--     Broadcast channel named `match:<match_id>`; Presence on that same channel
--     tracks who is connected.
--   * Durable state (who is playing, status, latest snapshot, winner) lives in
--     public.matches and is written at meaningful checkpoints.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by signed-in users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Every auth user (including anonymous ones) gets a profile automatically.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, 'Player-' || substr(replace(new.id::text, '-', ''), 1, 4));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Matches
-- ---------------------------------------------------------------------------

create type public.match_status as enum ('waiting', 'active', 'finished', 'abandoned');

create table public.matches (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  status      public.match_status not null default 'waiting',
  host_id     uuid not null references public.profiles (id) on delete cascade,
  guest_id    uuid references public.profiles (id) on delete set null,
  winner_id   uuid references public.profiles (id) on delete set null,
  -- Latest persisted game snapshot; shape is defined in packages/shared.
  state       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  finished_at timestamptz,
  constraint players_are_distinct check (guest_id is null or guest_id <> host_id),
  constraint winner_is_a_player check (winner_id is null or winner_id in (host_id, guest_id))
);

create index matches_host_id_idx  on public.matches (host_id);
create index matches_guest_id_idx on public.matches (guest_id);

alter table public.matches enable row level security;

create policy "players can view their matches"
  on public.matches for select
  to authenticated
  using ((select auth.uid()) in (host_id, guest_id));

-- Players may update state/status/winner of their own match. Creating and
-- joining go through the RPCs below so codes and seats can't be forged.
create policy "players can update their matches"
  on public.matches for update
  to authenticated
  using ((select auth.uid()) in (host_id, guest_id))
  with check ((select auth.uid()) in (host_id, guest_id));

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  if new.status in ('finished', 'abandoned') and old.status not in ('finished', 'abandoned') then
    new.finished_at = now();
  end if;
  return new;
end;
$$;

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- Clients must not be able to move themselves into someone else's seat.
create function public.protect_match_seats()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and (new.host_id is distinct from old.host_id
          or new.guest_id is distinct from old.guest_id
          or new.code is distinct from old.code) then
    raise exception 'host_id, guest_id and code cannot be changed directly';
  end if;
  return new;
end;
$$;

create trigger matches_protect_seats
  before update on public.matches
  for each row execute function public.protect_match_seats();

-- Creates a waiting match hosted by the caller and returns it.
create function public.create_match()
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.matches;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  loop
    begin
      insert into public.matches (code, host_id)
      values (upper(substr(md5(gen_random_uuid()::text), 1, 6)), auth.uid())
      returning * into result;
      return result;
    exception when unique_violation then
      -- Code collision; try again.
    end;
  end loop;
end;
$$;

-- Takes the free seat in a waiting match by code and starts it.
create function public.join_match(match_code text)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.matches;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into result
  from public.matches
  where code = upper(trim(match_code))
  for update;

  if not found then
    raise exception 'match not found';
  end if;

  -- Rejoining your own match is a no-op.
  if auth.uid() in (result.host_id, result.guest_id) then
    return result;
  end if;

  if result.status <> 'waiting' or result.guest_id is not null then
    raise exception 'match is full';
  end if;

  update public.matches
  set guest_id = auth.uid(), status = 'active'
  where id = result.id
  returning * into result;

  return result;
end;
$$;

revoke execute on function public.create_match() from public, anon;
revoke execute on function public.join_match(text) from public, anon;
grant execute on function public.create_match() to authenticated;
grant execute on function public.join_match(text) to authenticated;

-- Lets the lobby see the guest arrive / status change via Postgres Changes.
alter publication supabase_realtime add table public.matches;

-- ---------------------------------------------------------------------------
-- Realtime authorization for private channels `match:<match_id>`
-- ---------------------------------------------------------------------------

create function public.is_match_player(topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.matches m
    where 'match:' || m.id::text = topic
      and (select auth.uid()) in (m.host_id, m.guest_id)
  );
$$;

create policy "match players can receive broadcast and presence"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and public.is_match_player((select realtime.topic()))
  );

create policy "match players can send broadcast and presence"
  on realtime.messages for insert
  to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and public.is_match_player((select realtime.topic()))
  );
