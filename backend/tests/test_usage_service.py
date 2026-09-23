from unittest.mock import MagicMock

from app.services.usage_service import UsageService


def test_missing_counter_is_zero(monkeypatch) -> None:
    query = MagicMock()
    query.select.return_value = query
    query.eq.return_value = query
    query.maybe_single.return_value = query
    query.execute.return_value = None

    supabase = MagicMock()
    supabase.table.return_value = query
    monkeypatch.setattr(
        "app.services.usage_service.get_supabase_admin",
        lambda: supabase,
    )

    assert UsageService.get_counter("user-id", "clients_total") == 0
