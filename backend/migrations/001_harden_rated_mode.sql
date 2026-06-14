-- Transaction-safe, server-authoritative rated Sudoku mode.
-- Apply after backend/supabase_puzzles_seed.sql.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rating integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists rating integer default 1000;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

update public.profiles set rating = greatest(coalesce(rating, 1000), 0);

alter table public.profiles alter column rating set default 1000;
alter table public.profiles alter column rating set not null;
alter table public.profiles alter column created_at set default now();
alter table public.profiles alter column updated_at set default now();

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  puzzle_id uuid not null references public.puzzles(id),
  mode text not null default 'rated',
  status text not null default 'in_progress',
  current_board jsonb not null,
  rating_before integer not null,
  rating_after integer,
  rating_change integer,
  formula_version text,
  hints_used integer not null default 0,
  mistakes_made integer not null default 0,
  time_spent integer,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  rating_applied_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.games add column if not exists current_board jsonb;
alter table public.games add column if not exists rating_before integer;
alter table public.games add column if not exists rating_after integer;
alter table public.games add column if not exists rating_change integer;
alter table public.games add column if not exists formula_version text;
alter table public.games add column if not exists hints_used integer default 0;
alter table public.games add column if not exists mistakes_made integer default 0;
alter table public.games add column if not exists time_spent integer;
alter table public.games add column if not exists started_at timestamptz default now();
alter table public.games add column if not exists last_activity_at timestamptz default now();
alter table public.games add column if not exists completed_at timestamptz;
alter table public.games add column if not exists rating_applied_at timestamptz;
alter table public.games add column if not exists created_at timestamptz default now();

update public.games g
set current_board = p.puzzle_board
from public.puzzles p
where g.puzzle_id = p.id and g.current_board is null;

update public.games
set
  hints_used = greatest(coalesce(hints_used, 0), 0),
  mistakes_made = greatest(coalesce(mistakes_made, 0), 0),
  time_spent = greatest(coalesce(time_spent, 0), 0),
  started_at = coalesce(started_at, created_at, now()),
  last_activity_at = coalesce(last_activity_at, started_at, created_at, now());

-- Existing active games are closed without changing historical profile ratings.
update public.games
set
  status = 'abandoned',
  rating_after = coalesce(rating_after, rating_before),
  rating_change = coalesce(rating_change, 0),
  formula_version = coalesce(formula_version, 'legacy-migration'),
  completed_at = coalesce(completed_at, now()),
  rating_applied_at = coalesce(rating_applied_at, now())
where mode = 'rated' and status in ('started', 'in_progress');

update public.games set status = 'failed'
where status not in ('started', 'in_progress', 'completed', 'failed', 'abandoned', 'expired');

alter table public.games alter column current_board set not null;
alter table public.games alter column hints_used set default 0;
alter table public.games alter column hints_used set not null;
alter table public.games alter column mistakes_made set default 0;
alter table public.games alter column mistakes_made set not null;
alter table public.games alter column started_at set default now();
alter table public.games alter column started_at set not null;
alter table public.games alter column last_activity_at set default now();
alter table public.games alter column last_activity_at set not null;

create table if not exists public.rating_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  rating_before integer not null,
  rating_after integer not null,
  rating_change integer not null,
  formula_version text not null,
  outcome text not null,
  created_at timestamptz not null default now()
);

alter table public.rating_history add column if not exists formula_version text;
alter table public.rating_history add column if not exists outcome text;
alter table public.rating_history add column if not exists created_at timestamptz default now();

update public.rating_history
set
  formula_version = coalesce(formula_version, 'legacy'),
  outcome = coalesce(outcome, 'completed'),
  created_at = coalesce(created_at, now());

alter table public.rating_history alter column formula_version set not null;
alter table public.rating_history alter column outcome set not null;
alter table public.rating_history alter column created_at set default now();
alter table public.rating_history alter column created_at set not null;

delete from public.rating_history a
using public.rating_history b
where a.game_id = b.game_id and a.ctid < b.ctid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_rating_nonnegative'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_rating_nonnegative check (rating >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'games_status_valid'
      and conrelid = 'public.games'::regclass
  ) then
    alter table public.games
      add constraint games_status_valid
      check (status in ('started', 'in_progress', 'completed', 'failed', 'abandoned', 'expired'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'games_mode_valid'
      and conrelid = 'public.games'::regclass
  ) then
    alter table public.games
      add constraint games_mode_valid check (mode in ('casual', 'rated'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'games_stats_nonnegative'
      and conrelid = 'public.games'::regclass
  ) then
    alter table public.games
      add constraint games_stats_nonnegative
      check (
        hints_used >= 0
        and mistakes_made >= 0
        and (time_spent is null or time_spent >= 0)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'rating_history_outcome_valid'
      and conrelid = 'public.rating_history'::regclass
  ) then
    alter table public.rating_history
      add constraint rating_history_outcome_valid
      check (outcome in ('completed', 'failed', 'abandoned', 'expired'));
  end if;
end
$$;

create unique index if not exists idx_games_one_active_rated_per_user
  on public.games (user_id)
  where mode = 'rated' and status in ('started', 'in_progress');

create index if not exists idx_games_user_started_at
  on public.games (user_id, started_at desc);

create index if not exists idx_games_active_expiry
  on public.games (started_at)
  where mode = 'rated' and status in ('started', 'in_progress');

create unique index if not exists idx_rating_history_game_id
  on public.rating_history (game_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, rating)
  values (new.id, 1000)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

insert into public.profiles (id, rating)
select id, 1000 from auth.users
on conflict (id) do nothing;

create or replace function public.rated_calculate_change(
  p_completed boolean,
  p_player_rating integer,
  p_puzzle_rating integer,
  p_elapsed_seconds integer,
  p_hints_used integer,
  p_mistakes_made integer
)
returns integer
language plpgsql
immutable
set search_path = public
as $$
declare
  v_expected numeric;
  v_base_change integer;
  v_loss_change integer;
  v_adjustment integer;
  v_assisted_or_suspicious boolean;
begin
  if p_elapsed_seconds < 0 or p_hints_used < 0 or p_mistakes_made < 0 then
    raise exception 'rated_invalid_statistics';
  end if;

  v_expected := 1.0 / (1.0 + power(10.0, (p_puzzle_rating - p_player_rating) / 400.0));
  v_base_change := round(32.0 * ((case when p_completed then 1 else 0 end) - v_expected));
  v_loss_change := round(32.0 * (0 - v_expected));
  v_assisted_or_suspicious :=
    p_hints_used > 0
    or p_mistakes_made > 2
    or p_elapsed_seconds < 60
    or p_elapsed_seconds > 7200;

  if not p_completed or v_assisted_or_suspicious then
    return least(-1, v_loss_change);
  end if;

  v_adjustment := greatest(
    -8,
    least(4, 4 - floor(p_elapsed_seconds / 300.0)::integer - p_mistakes_made * 2)
  );

  return greatest(0, v_base_change + v_adjustment);
end;
$$;

create or replace function public.rated_game_payload(
  p_game_id uuid,
  p_user_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'game_id', g.id,
    'puzzle_id', g.puzzle_id,
    'mode', g.mode,
    'status', g.status,
    'puzzle_board', p.puzzle_board,
    'current_board', g.current_board,
    'difficulty', p.difficulty,
    'puzzle_rating', p.puzzle_rating,
    'rating_before', g.rating_before,
    'rating_after', g.rating_after,
    'rating_change', g.rating_change,
    'formula_version', g.formula_version,
    'rating_eligible', g.hints_used = 0 and g.mistakes_made <= 2,
    'rating_ineligibility_reason', case
      when g.hints_used > 0 then 'hint_used'
      when g.mistakes_made > 2 then 'too_many_mistakes'
      else null
    end,
    'hints_used', g.hints_used,
    'mistakes_made', g.mistakes_made,
    'time_spent', coalesce(
      g.time_spent,
      greatest(0, floor(extract(epoch from (now() - g.started_at)))::integer)
    ),
    'started_at', g.started_at,
    'last_activity_at', g.last_activity_at,
    'completed_at', g.completed_at
  )
  from public.games g
  join public.puzzles p on p.id = g.puzzle_id
  where g.id = p_game_id and g.user_id = p_user_id;
$$;

create or replace function public.rated_finalize_game(
  p_game_id uuid,
  p_user_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game record;
  v_profile_rating integer;
  v_elapsed integer;
  v_change integer;
  v_after integer;
  v_payload jsonb;
begin
  if p_status not in ('completed', 'failed', 'abandoned', 'expired') then
    raise exception 'rated_invalid_final_status';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select g.*, p.solution_board, p.puzzle_rating
  into v_game
  from public.games g
  join public.puzzles p on p.id = g.puzzle_id
  where g.id = p_game_id and g.user_id = p_user_id
  for update of g;

  if not found then
    raise exception 'rated_game_not_found';
  end if;

  if v_game.rating_applied_at is not null then
    return public.rated_game_payload(p_game_id, p_user_id)
      || jsonb_build_object('already_finalized', true);
  end if;

  if v_game.mode <> 'rated' or v_game.status not in ('started', 'in_progress') then
    raise exception 'rated_game_not_active';
  end if;

  if p_status = 'completed' and v_game.current_board <> v_game.solution_board then
    raise exception 'rated_game_incomplete';
  end if;

  select rating into v_profile_rating
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'rated_profile_not_found';
  end if;

  if v_profile_rating <> v_game.rating_before then
    raise exception 'rated_rating_conflict';
  end if;

  v_elapsed := greatest(0, floor(extract(epoch from (now() - v_game.started_at)))::integer);
  v_change := public.rated_calculate_change(
    p_status = 'completed',
    v_game.rating_before,
    v_game.puzzle_rating,
    v_elapsed,
    v_game.hints_used,
    v_game.mistakes_made
  );
  v_after := greatest(0, v_game.rating_before + v_change);

  update public.games
  set
    status = p_status,
    time_spent = v_elapsed,
    rating_after = v_after,
    rating_change = v_after - v_game.rating_before,
    formula_version = 'elo-performance-v2',
    completed_at = now(),
    last_activity_at = now(),
    rating_applied_at = now()
  where id = p_game_id;

  update public.profiles
  set rating = v_after, updated_at = now()
  where id = p_user_id;

  insert into public.rating_history (
    user_id,
    game_id,
    rating_before,
    rating_after,
    rating_change,
    formula_version,
    outcome
  )
  values (
    p_user_id,
    p_game_id,
    v_game.rating_before,
    v_after,
    v_after - v_game.rating_before,
    'elo-performance-v2',
    p_status
  )
  on conflict (game_id) do nothing;

  v_payload := public.rated_game_payload(p_game_id, p_user_id);
  return v_payload || jsonb_build_object('already_finalized', false);
end;
$$;

create or replace function public.start_rated_game(
  p_user_id uuid,
  p_recent_limit integer default 10,
  p_expire_after interval default interval '1 day'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_rating integer;
  v_game_id uuid;
  v_puzzle_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select id into v_game_id
  from public.games
  where user_id = p_user_id
    and mode = 'rated'
    and status in ('started', 'in_progress')
    and started_at <= now() - p_expire_after
  order by started_at
  limit 1
  for update;

  if found then
    perform public.rated_finalize_game(v_game_id, p_user_id, 'expired');
  end if;

  select id into v_game_id
  from public.games
  where user_id = p_user_id
    and mode = 'rated'
    and status in ('started', 'in_progress')
  order by started_at desc
  limit 1
  for update;

  if found then
    return public.rated_game_payload(v_game_id, p_user_id)
      || jsonb_build_object('active_game_exists', true);
  end if;

  select rating into v_profile_rating
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'rated_profile_not_found';
  end if;

  select p.id into v_puzzle_id
  from public.puzzles p
  where p.puzzle_rating between v_profile_rating - 100 and v_profile_rating + 100
    and not exists (
      select 1
      from (
        select g.puzzle_id
        from public.games g
        where g.user_id = p_user_id and g.mode = 'rated'
        order by g.started_at desc
        limit greatest(p_recent_limit, 0)
      ) recent
      where recent.puzzle_id = p.id
    )
  order by random()
  limit 1;

  if v_puzzle_id is null then
    select p.id into v_puzzle_id
    from public.puzzles p
    where p.puzzle_rating between v_profile_rating - 100 and v_profile_rating + 100
    order by random()
    limit 1;
  end if;

  if v_puzzle_id is null then
    select p.id into v_puzzle_id
    from public.puzzles p
    where not exists (
      select 1
      from (
        select g.puzzle_id
        from public.games g
        where g.user_id = p_user_id and g.mode = 'rated'
        order by g.started_at desc
        limit greatest(p_recent_limit, 0)
      ) recent
      where recent.puzzle_id = p.id
    )
    order by abs(p.puzzle_rating - v_profile_rating), random()
    limit 1;
  end if;

  if v_puzzle_id is null then
    select p.id into v_puzzle_id
    from public.puzzles p
    order by abs(p.puzzle_rating - v_profile_rating), random()
    limit 1;
  end if;

  if v_puzzle_id is null then
    raise exception 'rated_no_puzzles';
  end if;

  insert into public.games (
    user_id,
    puzzle_id,
    mode,
    status,
    current_board,
    rating_before
  )
  select
    p_user_id,
    p.id,
    'rated',
    'in_progress',
    p.puzzle_board,
    v_profile_rating
  from public.puzzles p
  where p.id = v_puzzle_id
  returning id into v_game_id;

  return public.rated_game_payload(v_game_id, p_user_id)
    || jsonb_build_object('active_game_exists', false);
end;
$$;

create or replace function public.move_rated_game(
  p_user_id uuid,
  p_game_id uuid,
  p_row integer,
  p_column integer,
  p_value integer,
  p_expire_after interval default interval '1 day'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game record;
  v_given integer;
  v_solution integer;
  v_correct boolean;
begin
  if p_row not between 0 and 8
    or p_column not between 0 and 8
    or p_value not between 1 and 9 then
    raise exception 'rated_invalid_move';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select g.*, p.puzzle_board, p.solution_board
  into v_game
  from public.games g
  join public.puzzles p on p.id = g.puzzle_id
  where g.id = p_game_id and g.user_id = p_user_id
  for update of g;

  if not found then
    raise exception 'rated_game_not_found';
  end if;

  if v_game.rating_applied_at is not null or v_game.status not in ('started', 'in_progress') then
    return public.rated_game_payload(p_game_id, p_user_id)
      || jsonb_build_object('accepted', false, 'reason', 'game_not_active');
  end if;

  if v_game.started_at <= now() - p_expire_after then
    return public.rated_finalize_game(p_game_id, p_user_id, 'expired')
      || jsonb_build_object('accepted', false, 'reason', 'expired');
  end if;

  v_given := (v_game.puzzle_board -> p_row ->> p_column)::integer;
  if v_given <> 0 then
    raise exception 'rated_given_cell';
  end if;

  v_solution := (v_game.solution_board -> p_row ->> p_column)::integer;
  v_correct := p_value = v_solution;

  if v_correct then
    update public.games
    set
      current_board = jsonb_set(
        current_board,
        array[p_row::text, p_column::text],
        to_jsonb(p_value),
        false
      ),
      last_activity_at = now()
    where id = p_game_id;
  else
    update public.games
    set mistakes_made = mistakes_made + 1, last_activity_at = now()
    where id = p_game_id;
  end if;

  return public.rated_game_payload(p_game_id, p_user_id)
    || jsonb_build_object('accepted', true, 'correct', v_correct);
end;
$$;

create or replace function public.hint_rated_game(
  p_user_id uuid,
  p_game_id uuid,
  p_expire_after interval default interval '1 day'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game record;
  v_row integer;
  v_column integer;
  v_value integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select g.*, p.solution_board
  into v_game
  from public.games g
  join public.puzzles p on p.id = g.puzzle_id
  where g.id = p_game_id and g.user_id = p_user_id
  for update of g;

  if not found then
    raise exception 'rated_game_not_found';
  end if;

  if v_game.rating_applied_at is not null or v_game.status not in ('started', 'in_progress') then
    return public.rated_game_payload(p_game_id, p_user_id)
      || jsonb_build_object('accepted', false, 'reason', 'game_not_active');
  end if;

  if v_game.started_at <= now() - p_expire_after then
    return public.rated_finalize_game(p_game_id, p_user_id, 'expired')
      || jsonb_build_object('accepted', false, 'reason', 'expired');
  end if;

  select r, c, (v_game.solution_board -> r ->> c)::integer
  into v_row, v_column, v_value
  from generate_series(0, 8) as rows(r)
  cross join generate_series(0, 8) as columns(c)
  where (v_game.current_board -> r ->> c)::integer = 0
  order by random()
  limit 1;

  if not found then
    raise exception 'rated_game_complete';
  end if;

  update public.games
  set
    current_board = jsonb_set(
      current_board,
      array[v_row::text, v_column::text],
      to_jsonb(v_value),
      false
    ),
    hints_used = hints_used + 1,
    last_activity_at = now()
  where id = p_game_id;

  return public.rated_game_payload(p_game_id, p_user_id)
    || jsonb_build_object(
      'accepted', true,
      'hint', jsonb_build_object('row', v_row, 'column', v_column, 'value', v_value)
    );
end;
$$;

create or replace function public.finish_rated_game(
  p_user_id uuid,
  p_game_id uuid,
  p_expire_after interval default interval '1 day'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game record;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select g.*
  into v_game
  from public.games g
  where g.id = p_game_id and g.user_id = p_user_id
  for update;

  if not found then
    raise exception 'rated_game_not_found';
  end if;

  if v_game.rating_applied_at is not null then
    return public.rated_game_payload(p_game_id, p_user_id)
      || jsonb_build_object('already_finalized', true);
  end if;

  if v_game.started_at <= now() - p_expire_after then
    return public.rated_finalize_game(p_game_id, p_user_id, 'expired');
  end if;

  return public.rated_finalize_game(p_game_id, p_user_id, 'completed');
end;
$$;

create or replace function public.abandon_rated_game(
  p_user_id uuid,
  p_game_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.rated_finalize_game(p_game_id, p_user_id, 'abandoned');
end;
$$;

create or replace function public.expire_old_rated_games(
  p_expire_after interval default interval '1 day'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game record;
  v_count integer := 0;
begin
  for v_game in
    select id, user_id
    from public.games
    where mode = 'rated'
      and status in ('started', 'in_progress')
      and started_at <= now() - p_expire_after
    order by started_at
  loop
    perform public.rated_finalize_game(v_game.id, v_game.user_id, 'expired');
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.rated_puzzle_pool_coverage(
  p_min_rating integer default 500,
  p_max_rating integer default 2500,
  p_step integer default 100
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with summary as (
    select count(*)::integer as puzzle_count,
           min(puzzle_rating)::integer as min_rating,
           max(puzzle_rating)::integer as max_rating
    from public.puzzles
  ),
  coverage as (
    select target_rating,
           (
             select count(*)::integer
             from public.puzzles p
             where p.puzzle_rating between target_rating - 100 and target_rating + 100
           ) as eligible_count
    from generate_series(p_min_rating, p_max_rating, greatest(p_step, 1)) target_rating
  )
  select jsonb_build_object(
    'puzzle_count', summary.puzzle_count,
    'min_rating', summary.min_rating,
    'max_rating', summary.max_rating,
    'healthy', summary.puzzle_count > 0
      and not exists (select 1 from coverage where eligible_count = 0),
    'coverage', (
      select jsonb_agg(
        jsonb_build_object('target_rating', target_rating, 'eligible_count', eligible_count)
        order by target_rating
      )
      from coverage
    )
  )
  from summary;
$$;

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.rating_history enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists games_select_own on public.games;
create policy games_select_own
  on public.games for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists rating_history_select_own on public.rating_history;
create policy rating_history_select_own
  on public.rating_history for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on function public.rated_calculate_change(boolean, integer, integer, integer, integer, integer)
  from public, anon, authenticated;
revoke all on function public.rated_game_payload(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.rated_finalize_game(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.start_rated_game(uuid, integer, interval)
  from public, anon, authenticated;
revoke all on function public.move_rated_game(uuid, uuid, integer, integer, integer, interval)
  from public, anon, authenticated;
revoke all on function public.hint_rated_game(uuid, uuid, interval)
  from public, anon, authenticated;
revoke all on function public.finish_rated_game(uuid, uuid, interval)
  from public, anon, authenticated;
revoke all on function public.abandon_rated_game(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.expire_old_rated_games(interval)
  from public, anon, authenticated;
revoke all on function public.rated_puzzle_pool_coverage(integer, integer, integer)
  from public, anon, authenticated;
revoke all on function public.handle_new_user_profile()
  from public, anon, authenticated;

grant execute on function public.start_rated_game(uuid, integer, interval) to service_role;
grant execute on function public.move_rated_game(uuid, uuid, integer, integer, integer, interval) to service_role;
grant execute on function public.hint_rated_game(uuid, uuid, interval) to service_role;
grant execute on function public.finish_rated_game(uuid, uuid, interval) to service_role;
grant execute on function public.abandon_rated_game(uuid, uuid) to service_role;
grant execute on function public.expire_old_rated_games(interval) to service_role;
grant execute on function public.rated_puzzle_pool_coverage(integer, integer, integer) to service_role;

-- Supabase projects with pg_cron enabled will run expiry every 15 minutes.
do $$
declare
  v_has_job boolean;
begin
  if to_regclass('cron.job') is not null then
    execute
      'select exists (select 1 from cron.job where jobname = $1)'
      into v_has_job
      using 'expire-old-rated-games';

    if not v_has_job then
      execute
        'select cron.schedule($1, $2, $3)'
        using
          'expire-old-rated-games',
          '*/15 * * * *',
          'select public.expire_old_rated_games();';
    end if;
  end if;
end
$$;

commit;
