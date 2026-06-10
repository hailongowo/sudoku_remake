-- Casual puzzles are disposable and never create game records.
-- Apply after 002_application_routes.sql.

begin;

drop function if exists public.abandon_casual_game(uuid, uuid);
drop function if exists public.finish_casual_game(uuid, uuid);
drop function if exists public.hint_casual_game(uuid, uuid);
drop function if exists public.move_casual_game(uuid, uuid, integer, integer, integer);
drop function if exists public.get_casual_game(uuid, uuid);
drop function if exists public.start_casual_game(uuid, text);
drop function if exists public.casual_game_payload(uuid, uuid);

delete from public.games where mode = 'casual';

alter table public.games drop constraint if exists games_mode_valid;
alter table public.games
  add constraint games_mode_valid check (mode = 'rated');

commit;
