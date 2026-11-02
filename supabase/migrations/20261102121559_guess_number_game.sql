-- Guess-the-number ("bomb number") game.
--
-- A mystery number in 1..100 is picked when a match is created. Players take
-- turns guessing a number inside the current range; each miss narrows the
-- range towards the mystery number. Whoever guesses the mystery number loses.
--
-- The mystery number lives in match_secrets, which clients cannot read, and
-- all moves go through make_guess() so turns and ranges are enforced
-- server-side. It is copied into matches.state only once the game is over.

create table public.match_secrets (
  match_id       uuid primary key references public.matches (id) on delete cascade,
  mystery_number int not null check (mystery_number between 1 and 100)
);

-- RLS on with no policies: invisible to anon/authenticated clients.
alter table public.match_secrets enable row level security;
revoke all on public.match_secrets from anon, authenticated;

-- All game writes now go through RPCs.
drop policy "players can update their matches" on public.matches;

create or replace function public.create_match()
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
      insert into public.matches (code, host_id, state)
      values (
        upper(substr(md5(gen_random_uuid()::text), 1, 6)),
        auth.uid(),
        jsonb_build_object(
          'low', 1,
          'high', 100,
          'turn', 'host',
          'moveCount', 0,
          'guesses', '[]'::jsonb
        )
      )
      returning * into result;
      exit;
    exception when unique_violation then
      -- Code collision; try again.
    end;
  end loop;

  insert into public.match_secrets (match_id, mystery_number)
  values (result.id, 1 + floor(random() * 100)::int);

  return result;
end;
$$;

create function public.make_guess(match_id uuid, guess int)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  m       public.matches;
  seat    text;
  low     int;
  high    int;
  mystery int;
  guesses jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into m from public.matches where id = make_guess.match_id for update;
  if not found then
    raise exception 'match not found';
  end if;

  if auth.uid() = m.host_id then
    seat := 'host';
  elsif auth.uid() = m.guest_id then
    seat := 'guest';
  else
    raise exception 'not a player in this match';
  end if;

  if m.status <> 'active' then
    raise exception 'match is not active';
  end if;

  if m.state->>'turn' <> seat then
    raise exception 'not your turn';
  end if;

  low  := (m.state->>'low')::int;
  high := (m.state->>'high')::int;
  if guess is null or guess < low or guess > high then
    raise exception 'guess must be between % and %', low, high;
  end if;

  select s.mystery_number into mystery
  from public.match_secrets s
  where s.match_id = m.id;

  guesses := coalesce(m.state->'guesses', '[]'::jsonb)
             || jsonb_build_array(jsonb_build_object('seat', seat, 'value', guess));

  if guess = mystery then
    update public.matches
    set status    = 'finished',
        winner_id = case when seat = 'host' then m.guest_id else m.host_id end,
        state     = m.state || jsonb_build_object(
                      'moveCount', (m.state->>'moveCount')::int + 1,
                      'guesses', guesses,
                      'loser', seat,
                      'mystery', mystery
                    )
    where id = m.id
    returning * into m;
  else
    if guess < mystery then
      low := guess + 1;
    else
      high := guess - 1;
    end if;

    update public.matches
    set state = m.state || jsonb_build_object(
                  'low', low,
                  'high', high,
                  'turn', case when seat = 'host' then 'guest' else 'host' end,
                  'moveCount', (m.state->>'moveCount')::int + 1,
                  'guesses', guesses
                )
    where id = m.id
    returning * into m;
  end if;

  return m;
end;
$$;

revoke execute on function public.make_guess(uuid, int) from public, anon;
grant execute on function public.make_guess(uuid, int) to authenticated;
