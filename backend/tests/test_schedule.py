from datetime import date, time
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.routers import appointments
from app.schemas.availability import AvailabilityCreate


class _AppointmentQuery:
    def __init__(self, rows: list[dict]) -> None:
        self.rows = rows

    def select(self, *args: object) -> "_AppointmentQuery":
        return self

    def eq(self, *args: object) -> "_AppointmentQuery":
        return self

    def gte(self, *args: object) -> "_AppointmentQuery":
        return self

    def lt(self, *args: object) -> "_AppointmentQuery":
        return self

    def neq(self, *args: object) -> "_AppointmentQuery":
        return self

    def execute(self) -> SimpleNamespace:
        return SimpleNamespace(data=self.rows)


class _Supabase:
    def __init__(self, rows: list[dict]) -> None:
        self.rows = rows

    def table(self, name: str) -> _AppointmentQuery:
        assert name == "appointments"
        return _AppointmentQuery(self.rows)


def test_business_times_are_persisted_as_utc_and_serialized_locally() -> None:
    local_start = appointments._local_datetime(
        date(2026, 1, 15),
        time(9, 0),
    )

    stored = appointments._to_storage(local_start)
    restored = appointments._from_storage(stored)

    assert stored.startswith("2026-01-15T12:00:00")
    assert restored.strftime("%Y-%m-%d %H:%M") == "2026-01-15 09:00"


def test_overlapping_appointment_is_rejected() -> None:
    supabase = _Supabase(
        [
            {
                "id": "appointment-existing",
                "date": "2026-01-15T12:00:00+00:00",
                "duration_minutes": 60,
                "status": "confirmado",
            }
        ]
    )

    with pytest.raises(HTTPException) as exc_info:
        appointments._ensure_no_conflict(
            supabase,
            "user-test",
            appointments._local_datetime(date(2026, 1, 15), time(9, 30)),
            appointments._local_datetime(date(2026, 1, 15), time(10, 30)),
        )

    assert exc_info.value.status_code == 409


def test_adjacent_appointment_is_allowed() -> None:
    supabase = _Supabase(
        [
            {
                "id": "appointment-existing",
                "date": "2026-01-15T12:00:00+00:00",
                "duration_minutes": 60,
                "status": "confirmado",
            }
        ]
    )

    appointments._ensure_no_conflict(
        supabase,
        "user-test",
        appointments._local_datetime(date(2026, 1, 15), time(10, 0)),
        appointments._local_datetime(date(2026, 1, 15), time(11, 0)),
    )


def test_availability_rejects_invalid_window() -> None:
    with pytest.raises(ValidationError):
        AvailabilityCreate(
            weekday=1,
            start_time=time(17, 0),
            end_time=time(9, 0),
            slot_duration=30,
        )
