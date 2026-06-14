from pathlib import Path


MIGRATIONS = Path("backend/migrations")
RATED_FORMULA_MIGRATIONS = [
    MIGRATIONS / "001_harden_rated_mode.sql",
    MIGRATIONS / "004_rating_antifarming_and_puzzle_security.sql",
]


def test_no_migration_contains_stale_rating_formula():
    migration_sql = "\n".join(
        path.read_text(encoding="utf-8").lower()
        for path in MIGRATIONS.glob("*.sql")
    )

    assert "elo-performance-v1" not in migration_sql
    assert "return greatest(1, v_base_change + v_adjustment)" not in migration_sql


def test_every_rating_formula_definition_has_antifarming_rules():
    for migration in RATED_FORMULA_MIGRATIONS:
        sql = migration.read_text(encoding="utf-8").lower()

        assert "p_hints_used > 0" in sql
        assert "p_mistakes_made > 2" in sql
        assert "p_elapsed_seconds < 60" in sql
        assert "p_elapsed_seconds > 7200" in sql
        assert "return least(-1, v_loss_change)" in sql
        assert "return greatest(0, v_base_change + v_adjustment)" in sql
        assert sql.count("'elo-performance-v2'") >= 2
