-- Essential application routes around rated mode and server-authoritative casual play.
-- Apply after 001_harden_rated_mode.sql.

begin;

alter table public.profiles add column if not exists display_name text;

update public.profiles
set display_name = 'Player-' || substring(md5(id::text), 1, 8)
where display_name is null or btrim(display_name) = '';

alter table public.profiles alter column display_name set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_display_name_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_display_name_valid
      check (
        char_length(btrim(display_name)) between 3 and 24
        and display_name ~ '^[A-Za-z0-9 _-]+$'
      );
  end if;
end
$$;

create unique index if not exists idx_profiles_display_name_unique
  on public.profiles (lower(display_name));

create index if not exists idx_profiles_rating_leaderboard
  on public.profiles (rating desc, created_at asc);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, rating, display_name)
  values (
    new.id,
    1000,
    'Player-' || substring(md5(new.id::text), 1, 8)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.update_player_profile(
  p_user_id uuid,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_display_name text := btrim(p_display_name);
begin
  if char_length(v_display_name) not between 3 and 24
    or v_display_name !~ '^[A-Za-z0-9 _-]+$' then
    raise exception 'profile_invalid_display_name';
  end if;

  begin
    update public.profiles
    set display_name = v_display_name, updated_at = now()
    where id = p_user_id
    returning id, display_name, rating, created_at, updated_at into v_profile;
  exception
    when unique_violation then
      raise exception 'profile_display_name_taken';
  end;

  if not found then
    raise exception 'profile_not_found';
  end if;

  return jsonb_build_object(
    'id', v_profile.id,
    'display_name', v_profile.display_name,
    'rating', v_profile.rating,
    'created_at', v_profile.created_at,
    'updated_at', v_profile.updated_at
  );
end;
$$;

create or replace function public.get_player_summary(
  p_user_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with ranked_profiles as (
    select
      id,
      dense_rank() over (order by rating desc)::integer as rating_rank
    from public.profiles
  ),
  stats as (
    select
      count(*)::integer as rated_games,
      count(*) filter (where outcome = 'completed')::integer as rated_wins,
      count(*) filter (where outcome <> 'completed')::integer as rated_losses,
      max(rating_after)::integer as peak_rating
    from public.rating_history
    where user_id = p_user_id
  )
  select jsonb_build_object(
    'id', p.id,
    'display_name', p.display_name,
    'rating', p.rating,
    'rating_rank', rp.rating_rank,
    'rated_games', stats.rated_games,
    'rated_wins', stats.rated_wins,
    'rated_losses', stats.rated_losses,
    'peak_rating', greatest(p.rating, coalesce(stats.peak_rating, p.rating)),
    'created_at', p.created_at,
    'updated_at', p.updated_at
  )
  from public.profiles p
  join ranked_profiles rp on rp.id = p.id
  cross join stats
  where p.id = p_user_id;
$$;

create or replace function public.get_rating_leaderboard(
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select
      p.id,
      p.display_name,
      p.rating,
      dense_rank() over (order by p.rating desc)::integer as rank
    from public.profiles p
  ),
  stats as (
    select
      user_id,
      count(*)::integer as rated_games,
      count(*) filter (where outcome = 'completed')::integer as rated_wins
    from public.rating_history
    group by user_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'rank', ranked.rank,
        'display_name', ranked.display_name,
        'rating', ranked.rating,
        'rated_games', coalesce(stats.rated_games, 0),
        'rated_wins', coalesce(stats.rated_wins, 0)
      )
      order by ranked.rank, ranked.display_name
    ),
    '[]'::jsonb
  )
  from (
    select *
    from ranked
    order by rank, display_name
    limit greatest(1, least(p_limit, 100))
    offset greatest(p_offset, 0)
  ) ranked
  left join stats on stats.user_id = ranked.id;
$$;

create or replace function public.get_active_rated_game(
  p_user_id uuid,
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

  select *
  into v_game
  from public.games g
  where g.user_id = p_user_id
    and g.mode = 'rated'
    and g.status in ('started', 'in_progress')
  order by g.started_at desc
  limit 1
  for update;

  if not found then
    return null;
  end if;

  if v_game.started_at <= now() - p_expire_after then
    perform public.rated_finalize_game(v_game.id, p_user_id, 'expired');
    return null;
  end if;

  return public.rated_game_payload(v_game.id, p_user_id);
end;
$$;

create or replace function public.get_rated_history(
  p_user_id uuid,
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'game_id', g.id,
        'puzzle_id', g.puzzle_id,
        'difficulty', p.difficulty,
        'puzzle_rating', p.puzzle_rating,
        'status', g.status,
        'rating_before', g.rating_before,
        'rating_after', g.rating_after,
        'rating_change', g.rating_change,
        'formula_version', g.formula_version,
        'time_spent', g.time_spent,
        'hints_used', g.hints_used,
        'mistakes_made', g.mistakes_made,
        'started_at', g.started_at,
        'completed_at', g.completed_at
      )
      order by g.started_at desc
    ),
    '[]'::jsonb
  )
  from (
    select *
    from public.games
    where user_id = p_user_id
      and mode = 'rated'
      and status not in ('started', 'in_progress')
    order by started_at desc
    limit greatest(1, least(p_limit, 100))
    offset greatest(p_offset, 0)
  ) g
  join public.puzzles p on p.id = g.puzzle_id;
$$;

revoke all on function public.update_player_profile(uuid, text)
  from public, anon, authenticated;
revoke all on function public.get_player_summary(uuid)
  from public, anon, authenticated;
revoke all on function public.get_rating_leaderboard(integer, integer)
  from public, anon, authenticated;
revoke all on function public.get_active_rated_game(uuid, interval)
  from public, anon, authenticated;
revoke all on function public.get_rated_history(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.update_player_profile(uuid, text) to service_role;
grant execute on function public.get_player_summary(uuid) to service_role;
grant execute on function public.get_rating_leaderboard(integer, integer) to service_role;
grant execute on function public.get_active_rated_game(uuid, interval) to service_role;
grant execute on function public.get_rated_history(uuid, integer, integer) to service_role;
commit;
