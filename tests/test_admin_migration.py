from pathlib import Path


MIGRATION = Path("backend/migrations/005_admin_user_management.sql")


def test_admin_migration_defines_allowlist_audit_and_suspension():
    sql = MIGRATION.read_text(encoding="utf-8").lower()

    assert "create table if not exists public.admin_users" in sql
    assert "create table if not exists public.admin_audit_log" in sql
    assert "alter table public.profiles add column if not exists suspended_at" in sql
    assert "alter table public.profiles add column if not exists suspended_by" in sql
    assert "alter table public.profiles add column if not exists suspension_reason" in sql


def test_admin_migration_blocks_suspended_rated_starts_and_audits_mutations():
    sql = MIGRATION.read_text(encoding="utf-8").lower()

    assert "raise exception 'admin_user_suspended'" in sql
    assert "create or replace function public.start_rated_game" in sql
    assert "insert into public.admin_audit_log" in sql
    assert "'admin_update_user_profile'" in sql
    assert "'admin_suspend_user'" in sql
    assert "'admin_reactivate_user'" in sql


def test_admin_rpc_execution_is_service_role_only():
    sql = MIGRATION.read_text(encoding="utf-8").lower()

    assert "revoke all on function public.admin_get_me(uuid)" in sql
    assert "grant execute on function public.admin_get_me(uuid) to service_role" in sql
    assert "grant execute on function public.admin_list_users(uuid, text, integer, integer) to service_role" in sql
