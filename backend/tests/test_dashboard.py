"""Regression checks for dashboard error handling and business-day bounds."""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.routers import dashboard


class _Query:
    def __init__(self, table: str, calls: list[tuple[str, str, str]]) -> None:
        self.table = table
        self.calls = calls

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def gte(self, column: str, value: str):
        self.calls.append((self.table, f"gte:{column}", value))
        return self

    def lt(self, column: str, value: str):
        self.calls.append((self.table, f"lt:{column}", value))
        return self

    def lte(self, column: str, value: str):
        self.calls.append((self.table, f"lte:{column}", value))
        return self

    def order(self, *args, **kwargs):
        return self

    def execute(self):
        return SimpleNamespace(data=[], count=0)


class _Database:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str, str]] = []

    def table(self, name: str):
        return _Query(name, self.calls)


@pytest.mark.asyncio
async def test_dashboard_does_not_expose_database_error(monkeypatch, caplog) -> None:
    class _BrokenDatabase:
        def table(self, name: str):
            raise RuntimeError("internal-canary-private")

    monkeypatch.setattr(dashboard, "get_supabase_admin", _BrokenDatabase)
    with pytest.raises(HTTPException) as raised:
        await dashboard.get_dashboard_data(month=8, year=2026, current_user={"id": "synthetic-user"})

    assert raised.value.status_code == 500
    assert raised.value.detail == "Erro interno ao carregar o dashboard."
    assert "internal-canary-private" not in caplog.text


@pytest.mark.asyncio
async def test_dashboard_does_not_expose_client_creation_error(monkeypatch, caplog) -> None:
    def broken_client():
        raise RuntimeError("private-client-error")

    monkeypatch.setattr(dashboard, "get_supabase_admin", broken_client)
    with pytest.raises(HTTPException) as raised:
        await dashboard.get_dashboard_data(month=8, year=2026, current_user={"id": "synthetic-user"})

    assert raised.value.status_code == 500
    assert raised.value.detail == "Erro interno ao carregar o dashboard."
    assert "private-client-error" not in caplog.text


@pytest.mark.asyncio
async def test_dashboard_queries_appointments_for_business_day(monkeypatch) -> None:
    database = _Database()
    monkeypatch.setattr(dashboard, "get_supabase_admin", lambda: database)

    class _FrozenDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            instant = datetime(2026, 9, 1, 0, 30, tzinfo=timezone.utc)
            return instant.astimezone(tz) if tz else instant.replace(tzinfo=None)

    monkeypatch.setattr(dashboard, "datetime", _FrozenDatetime)
    monkeypatch.setattr(dashboard, "ZoneInfo", lambda _: timezone(timedelta(hours=-3)))
    monkeypatch.setattr(
        dashboard,
        "get_settings",
        lambda: SimpleNamespace(business_timezone="America/Sao_Paulo"),
        raising=False,
    )

    await dashboard.get_dashboard_data(month=8, year=2026, current_user={"id": "synthetic-user"})

    day_start = datetime(2026, 8, 31, tzinfo=timezone(timedelta(hours=-3)))
    day_end = datetime(2026, 9, 1, tzinfo=timezone(timedelta(hours=-3)))
    assert ("appointments", "gte:date", day_start.astimezone(timezone.utc).isoformat()) in database.calls
    assert ("appointments", "lt:date", day_end.astimezone(timezone.utc).isoformat()) in database.calls
    assert ("transactions", "gte:date", "2026-08-31") in database.calls
