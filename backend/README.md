# Sudoku Backend

## Setup

1. Create a virtual environment and install `requirements-dev.txt`.
2. Copy `.env.example` to `.env` and provide a Supabase service-role key.
3. Apply `supabase_puzzles_seed.sql`.
4. Enable Supabase's `pg_cron` extension if you want automatic rated-game expiry.
5. Apply migrations in `migrations/` in numeric order.
6. Run the API with:

```powershell
uvicorn backend.main:app --reload
```

The service-role key must only be available to the backend. Rated endpoints require
a Supabase access token in the `Authorization: Bearer <token>` header.

## Rated Mode

Rated game state and statistics are authoritative in PostgreSQL. The API delegates
all rated mutations to service-role-only RPCs so game, profile, and rating-history
updates commit or roll back together.

The rated migration schedules `expire_old_rated_games()` every 15 minutes when
`pg_cron` is enabled. The authenticated `GET /rated/pool-coverage` endpoint reports
rating ranges that do not currently have suitable puzzles.

## Application Routes

- Rated: start, active game, history, move, hint, finish, abandon, and pool coverage.
- Casual: request a disposable puzzle with `GET /casual/new?difficulty=Easy`.
- Players: authenticated profile summary and display-name update.
- Leaderboard: public rating leaderboard without exposing user IDs.

Rated moves are validated inside PostgreSQL against the protected solution.
Incorrect rated moves are not stored and increment the server-side mistake counter.
Casual puzzle state, notes, timer, hints, and mistakes remain entirely client-side;
requesting another puzzle creates no database game record.

Run unit tests with:

```powershell
pytest
```

Integration tests require a disposable Supabase project and are enabled with
`RUN_SUPABASE_INTEGRATION=1`.
