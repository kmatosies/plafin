"""
Router de agendamentos.
CRUD completo com filtros por data e status.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from postgrest.exceptions import APIError
from typing import Optional
from datetime import date, datetime, time, timedelta, timezone
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse,
)
from app.middleware.auth import get_current_user
from app.config import get_settings
from app.database import get_supabase_admin
from zoneinfo import ZoneInfo

router = APIRouter(prefix="/appointments", tags=["Agendamentos"])


def _business_timezone() -> ZoneInfo:
    return ZoneInfo(get_settings().business_timezone)


def _local_datetime(day: date, value: time) -> datetime:
    return datetime.combine(day, value, tzinfo=_business_timezone())


def _from_storage(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(_business_timezone())


def _to_storage(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat()


def _raise_write_error(exc: APIError) -> None:
    if getattr(exc, "code", None) == "23P01":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um agendamento neste intervalo.",
        ) from exc
    raise exc


def _ensure_client_belongs_to_user(supabase, client_id: str, user_id: str) -> None:
    result = (
        supabase.table("clients")
        .select("id")
        .eq("id", client_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=400, detail="Cliente inválido para este usuário.")


def _ensure_no_conflict(
    supabase,
    user_id: str,
    start_dt: datetime,
    end_dt: datetime,
    *,
    exclude_id: str | None = None,
) -> None:
    day_start = datetime.combine(
        start_dt.date(),
        time.min,
        tzinfo=_business_timezone(),
    )
    day_end = day_start + timedelta(days=1)
    query = (
        supabase.table("appointments")
        .select("id, date, duration_minutes, status")
        .eq("user_id", user_id)
        .gte("date", _to_storage(day_start))
        .lt("date", _to_storage(day_end))
        .neq("status", "cancelado")
    )
    if exclude_id:
        query = query.neq("id", exclude_id)

    result = query.execute()
    for appointment in result.data or []:
        existing_start = _from_storage(appointment["date"])
        existing_end = existing_start + timedelta(
            minutes=appointment.get("duration_minutes", 60) or 60,
        )
        if start_dt < existing_end and end_dt > existing_start:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um agendamento neste intervalo.",
            )


def _serialize_appointment(row: dict) -> dict:
    if not row:
        return row

    appointment_dt = _from_storage(row["date"])
    duration = row.get("duration_minutes", 60) or 60
    end_dt = appointment_dt + timedelta(minutes=duration)
    row["date"] = appointment_dt.date().isoformat()
    row["start_time"] = appointment_dt.strftime("%H:%M")
    row["end_time"] = end_dt.strftime("%H:%M")
    row["title"] = row.get("title") or row.get("notes") or "Agendamento"
    row.setdefault("value", None)
    return row


@router.get("/", response_model=list[AppointmentResponse])
async def list_appointments(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
):
    """Lista agendamentos com filtros opcionais."""
    supabase = get_supabase_admin()
    query = (
        supabase.table("appointments")
        .select("*, clients(name)")
        .eq("user_id", current_user["id"])
    )

    if month and year:
        start_date = datetime(year, month, 1, tzinfo=_business_timezone())
        if month == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=_business_timezone())
        else:
            end_date = datetime(year, month + 1, 1, tzinfo=_business_timezone())
        query = query.gte("date", _to_storage(start_date)).lt(
            "date",
            _to_storage(end_date),
        )

    if status_filter:
        query = query.eq("status", status_filter)

    result = query.order("date", desc=False).execute()

    # Mapear nome do cliente
    appointments = []
    for item in (result.data or []):
        client_data = item.pop("clients", None)
        item["client_name"] = client_data["name"] if client_data else None
        appointments.append(_serialize_appointment(item))

    return appointments


@router.get("/today", response_model=list[AppointmentResponse])
async def list_today_appointments(
    current_user: dict = Depends(get_current_user),
):
    """Lista agendamentos de hoje."""
    supabase = get_supabase_admin()
    now = datetime.now(_business_timezone())
    today_start = datetime.combine(now.date(), time.min, tzinfo=_business_timezone())
    today_end = today_start + timedelta(days=1)

    result = (
        supabase.table("appointments")
        .select("*, clients(name)")
        .eq("user_id", current_user["id"])
        .gte("date", _to_storage(today_start))
        .lt("date", _to_storage(today_end))
        .order("date")
        .execute()
    )

    appointments = []
    for item in (result.data or []):
        client_data = item.pop("clients", None)
        item["client_name"] = client_data["name"] if client_data else None
        appointments.append(_serialize_appointment(item))

    return appointments


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Busca um agendamento específico."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("appointments")
        .select("*, clients(name)")
        .eq("id", appointment_id)
        .eq("user_id", current_user["id"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")

    appointment = result.data[0]
    client_data = appointment.pop("clients", None)
    appointment["client_name"] = client_data["name"] if client_data else None

    return _serialize_appointment(appointment)


@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    data: AppointmentCreate,
    current_user: dict = Depends(get_current_user),
):
    """Cria um novo agendamento."""
    supabase = get_supabase_admin()
    start_dt = _local_datetime(data.date, data.start_time)
    end_dt = _local_datetime(data.date, data.end_time)
    if end_dt <= start_dt:
        raise HTTPException(status_code=400, detail="Horário final deve ser maior que o horário inicial.")
    _ensure_client_belongs_to_user(supabase, data.client_id, current_user["id"])
    if data.status != "cancelado":
        _ensure_no_conflict(
            supabase,
            current_user["id"],
            start_dt,
            end_dt,
        )

    appointment_data = {
        "user_id": current_user["id"],
        "client_id": data.client_id,
        "title": data.title or data.notes or "Agendamento",
        "date": _to_storage(start_dt),
        "duration_minutes": int((end_dt - start_dt).total_seconds() // 60),
        "status": data.status,
        "notes": data.notes,
    }

    try:
        result = supabase.table("appointments").insert(appointment_data).execute()
    except APIError as exc:
        _raise_write_error(exc)

    if not result.data:
        raise HTTPException(status_code=500, detail="Erro ao criar agendamento.")

    return _serialize_appointment(result.data[0])


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: str,
    data: AppointmentUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Atualiza um agendamento existente."""
    supabase = get_supabase_admin()

    existing = (
        supabase.table("appointments")
        .select("id")
        .eq("id", appointment_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")

    existing_data = (
        supabase.table("appointments")
        .select("*")
        .eq("id", appointment_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not existing_data.data:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")

    source = existing_data.data[0]
    update_data = data.model_dump(exclude_unset=True)

    current_start = _from_storage(source["date"])
    new_date = update_data.get("date", current_start.date())
    new_start_time = update_data.get("start_time", current_start.time().replace(second=0, microsecond=0))
    current_end = current_start + timedelta(minutes=source.get("duration_minutes", 60) or 60)
    new_end_time = update_data.get("end_time", current_end.time().replace(second=0, microsecond=0))

    start_dt = _local_datetime(new_date, new_start_time)
    end_dt = _local_datetime(new_date, new_end_time)
    if end_dt <= start_dt:
        raise HTTPException(status_code=400, detail="Horário final deve ser maior que o horário inicial.")

    payload = {
        "date": _to_storage(start_dt),
        "duration_minutes": int((end_dt - start_dt).total_seconds() // 60),
    }
    if "client_id" in update_data:
        _ensure_client_belongs_to_user(
            supabase,
            update_data["client_id"],
            current_user["id"],
        )
        payload["client_id"] = update_data["client_id"]
    if "status" in update_data:
        payload["status"] = update_data["status"]
    if "notes" in update_data:
        payload["notes"] = update_data["notes"]
    if "title" in update_data:
        payload["title"] = update_data["title"] or update_data.get("notes") or source.get("title") or "Agendamento"

    effective_status = payload.get("status", source.get("status", "pendente"))
    if effective_status != "cancelado":
        _ensure_no_conflict(
            supabase,
            current_user["id"],
            start_dt,
            end_dt,
            exclude_id=appointment_id,
        )

    try:
        result = (
            supabase.table("appointments")
            .update(payload)
            .eq("id", appointment_id)
            .eq("user_id", current_user["id"])
            .execute()
        )
    except APIError as exc:
        _raise_write_error(exc)

    return _serialize_appointment(result.data[0])


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove um agendamento."""
    supabase = get_supabase_admin()

    existing = (
        supabase.table("appointments")
        .select("id")
        .eq("id", appointment_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")

    (
        supabase.table("appointments")
        .delete()
        .eq("id", appointment_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
