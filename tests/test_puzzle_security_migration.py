from pathlib import Path


MIGRATION = Path("backend/migrations/004_rating_antifarming_and_puzzle_security.sql")
SEED = Path("backend/supabase_puzzles_seed.sql")


def test_puzzle_table_has_explicit_rls_and_direct_privilege_revocation():
    sql = MIGRATION.read_text(encoding="utf-8").lower()

    assert "alter table public.puzzles enable row level security" in sql
    assert "revoke all privileges on table public.puzzles from public, anon, authenticated" in sql
    assert "where schemaname = 'public' and tablename = 'puzzles'" in sql


def test_only_safe_random_puzzle_function_is_publicly_executable():
    sql = MIGRATION.read_text(encoding="utf-8").lower()

    assert "revoke all on function public.get_random_puzzle(text) from public" in sql
    assert (
        "grant execute on function public.get_random_puzzle(text) "
        "to anon, authenticated, service_role"
    ) in sql


def test_security_migration_fails_if_solution_access_remains_possible():
    sql = MIGRATION.read_text(encoding="utf-8").lower()

    assert "puzzle_security_rls_disabled" in sql
    assert "puzzle_security_policy_present" in sql
    assert "puzzle_security_direct_select_granted" in sql
    assert "puzzle_security_public_select_granted" in sql


def test_seed_also_revokes_direct_puzzle_access():
    sql = SEED.read_text(encoding="utf-8").lower()

    assert "alter table public.puzzles enable row level security" in sql
    assert "revoke all privileges on table public.puzzles from public, anon, authenticated" in sql
    assert "revoke all on function public.get_random_puzzle(text) from public" in sql
