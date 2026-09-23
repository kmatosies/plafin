import pytest
from fastapi.testclient import TestClient

from app import main


@pytest.mark.asyncio
async def test_disabled_worker_is_not_started(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main.settings, "enable_notification_worker", False)

    def fail_if_started(*args: object, **kwargs: object) -> None:
        pytest.fail("notification worker should not start while disabled")

    monkeypatch.setattr(main.asyncio, "create_task", fail_if_started)

    async with main.lifespan(main.app):
        pass


def test_health_endpoint_starts_without_optional_integrations(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(main.settings, "enable_notification_worker", False)

    with TestClient(main.app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_phase_two_ai_routes_are_not_mounted() -> None:
    paths = set(main.app.openapi()["paths"])

    assert "/api/ai/finance/chat" not in paths
    assert "/api/ai/whatsapp/webhook" not in paths


def test_public_route_contract_is_mounted_once() -> None:
    paths = list(main.app.openapi()["paths"])

    assert "/api/stripe/webhook" in paths
    assert "/api/availability/config" in paths
    assert "/api/availability/slots" in paths
    assert "/api/availability/agenda/slots" not in paths


def test_private_route_rejects_missing_bearer_token() -> None:
    with TestClient(main.app) as client:
        response = client.get("/api/clients/")

    assert response.status_code == 401
