"""End-to-end API smoke test against the disposable local Supabase stack."""

from __future__ import annotations

import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_LOCAL_INTEGRATION") != "1",
    reason="requires the local Supabase Auth and REST services",
)


def test_auth_tenant_crud_and_schedule_conflict() -> None:
    from app.database import get_supabase_admin
    from app.main import app

    password = f"Cycle02-{uuid4().hex[:12]}"
    emails = [
        f"cycle02-{uuid4().hex}@example.com",
        f"cycle02-{uuid4().hex}@example.com",
    ]
    created_user_ids: list[str] = []

    with TestClient(app) as client:
        try:
            sessions: list[dict] = []
            for index, email in enumerate(emails, start=1):
                response = client.post(
                    "/api/auth/register",
                    json={
                        "email": email,
                        "password": password,
                        "full_name": f"Cycle 02 User {index}",
                    },
                )
                assert response.status_code == 201, response.text
                body = response.json()
                assert body["access_token"]
                created_user_ids.append(body["user"]["id"])
                sessions.append(
                    {"Authorization": f"Bearer {body['access_token']}"}
                )

            first, second = sessions
            client_response = client.post(
                "/api/clients/",
                headers=first,
                json={"name": "Cliente Integracao"},
            )
            assert client_response.status_code == 201, client_response.text
            client_id = client_response.json()["id"]

            foreign_client = client.get(
                f"/api/clients/{client_id}",
                headers=second,
            )
            assert foreign_client.status_code == 404

            transaction = client.post(
                "/api/transactions/",
                headers=first,
                json={
                    "description": "Receita de integracao",
                    "amount": 125.5,
                    "date": "2030-01-07",
                    "type": "receita",
                    "status": "pago",
                    "client_id": client_id,
                },
            )
            assert transaction.status_code == 201, transaction.text

            foreign_transaction = client.post(
                "/api/transactions/",
                headers=second,
                json={
                    "description": "Tentativa entre tenants",
                    "amount": 10,
                    "date": "2030-01-07",
                    "type": "receita",
                    "client_id": client_id,
                },
            )
            assert foreign_transaction.status_code == 400

            availability = client.post(
                "/api/availability/config",
                headers=first,
                json={
                    "weekday": 0,
                    "start_time": "08:00:00",
                    "end_time": "12:00:00",
                    "slot_duration": 30,
                },
            )
            assert availability.status_code == 201, availability.text

            appointment_payload = {
                "client_id": client_id,
                "date": "2030-01-07",
                "start_time": "09:00:00",
                "end_time": "10:00:00",
                "title": "Consulta de integracao",
            }
            appointment = client.post(
                "/api/appointments/",
                headers=first,
                json=appointment_payload,
            )
            assert appointment.status_code == 201, appointment.text
            appointment_id = appointment.json()["id"]

            overlap = client.post(
                "/api/appointments/",
                headers=first,
                json={
                    **appointment_payload,
                    "start_time": "09:30:00",
                    "end_time": "10:30:00",
                },
            )
            assert overlap.status_code == 409, overlap.text

            foreign_appointment = client.get(
                f"/api/appointments/{appointment_id}",
                headers=second,
            )
            assert foreign_appointment.status_code == 404

            slots = client.get(
                "/api/availability/slots",
                headers=first,
                params={"date": "2030-01-07"},
            )
            assert slots.status_code == 200, slots.text
            assert "2030-01-07 08:00:00" in slots.json()["slots"]
            assert "2030-01-07 09:00:00" not in slots.json()["slots"]
            assert "2030-01-07 09:30:00" not in slots.json()["slots"]
            assert "2030-01-07 10:00:00" in slots.json()["slots"]

            summary = client.get(
                "/api/transactions/summary",
                headers=first,
                params={"month": 1, "year": 2030},
            )
            assert summary.status_code == 200, summary.text
            assert summary.json()["transaction_count"] == 1
        finally:
            admin = get_supabase_admin()
            for user_id in created_user_ids:
                admin.auth.admin.delete_user(user_id)
