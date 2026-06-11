-- Prevent assisted/suspicious rated solves from farming rating and explicitly
-- protect puzzle solutions from direct API access.
-- Apply after 003_disposable_casual_mode.sql.

begin;

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

-- Raw-SQL-created public tables require explicit RLS. Remove every direct policy
-- and privilege so solution_board is available only to trusted definer functions
-- and the backend's service role.
alter table public.puzzles enable row level security;

do $$
declare
  v_policy record;
begin
  for v_policy in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'puzzles'
  loop
    execute format('drop policy if exists %I on public.puzzles', v_policy.policyname);
  end loop;
end
$$;

revoke all privileges on table public.puzzles from public, anon, authenticated;
revoke all on function public.get_random_puzzle(text) from public;
grant execute on function public.get_random_puzzle(text) to anon, authenticated, service_role;

-- Fail the migration if direct client access to solution_board is still possible.
do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'puzzles'
      and c.relrowsecurity
  ) then
    raise exception 'puzzle_security_rls_disabled';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'puzzles'
  ) then
    raise exception 'puzzle_security_policy_present';
  end if;

  if has_table_privilege('anon', 'public.puzzles', 'SELECT')
    or has_table_privilege('authenticated', 'public.puzzles', 'SELECT') then
    raise exception 'puzzle_security_direct_select_granted';
  end if;

  if exists (
    select 1
    from pg_class c
    cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
    where c.oid = 'public.puzzles'::regclass
      and acl.grantee = 0
      and acl.privilege_type = 'SELECT'
  ) then
    raise exception 'puzzle_security_public_select_granted';
  end if;
end
$$;

commit;
