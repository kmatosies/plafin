"""
Router de agendamentos.
CRUD completo com filtros por data e status.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from datetime import date, datetime
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse,
)
from app.middleware.auth import get_current_user
from app.database import get_supabase_admin

router = APIRouter(prefix="/appointments", tags=["Agendamentos"])


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
        start_date = datetime(year, month, 1).isoformat()
        if month == 12:
            end_date = datetime(year + 1, 1, 1).isoformat()
        else:
            end_date = datetime(year, month + 1, 1).isoformat()
        query = query.gte("date", start_date).lt("date", end_date)

    if status_filter:
        query = query.eq("status", status_filter)

    result = query.order("date", desc=False).execute()

    # Mapear nome do cliente
    appointments = []
    for item in (result.data or []):
        client_data = item.pop("clients", None)
        item["client_name"] = client_data["name"] if client_data else None
        appointments.append(item)

    return appointments


@router.get("/today", response_model=list[AppointmentResponse])
async def list_today_appointments(
    current_user: dict = Depends(get_current_user),
):
    """Lista agendamentos de hoje."""
    supabase = get_supabase_admin()
    today_start = datetime.now().replace(hour=0, minute=0, second=0).isoformat()
    today_end = datetime.now().replace(hour=23, minute=59, second=59).isoformat()

    result = (
        supabase.table("appointments")
        .select("*, clients(name)")
        .eq("user_id", current_user["id"])
        .gte("date", today_start)
        .lte("date", today_end)
        .order("date")
        .execute()
    )

    appointments = []
    for item in (result.data or []):
        client_data = item.pop("clients", None)
        item["client_name"] = client_data["name"] if client_data else None
        appointments.append(item)

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
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")

    client_data = result.data.pop("clients", None)
    result.data["client_name"] = client_data["name"] if client_data else None

    return result.data


@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    data: AppointmentCreate,
    current_user: dict = Depends(get_current_user),
):
    """Cria um novo agendamento."""
    supabase = get_supabase_admin()
    appointment_data = data.model_dump()
    appointment_data["user_id"] = current_user["id"]
    appointment_data["date"] = appointment_data["date"].isoformat()

    result = supabase.table("appointments").insert(appointment_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Erro ao criar agendamento.")

    return result.data[0]


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

    update_data = data.model_dump(exclude_unset=True)
    if "date" in update_data and update_data["date"]:
        update_data["date"] = update_data["date"].isoformat()

    result = (
        supabase.table("appointments")
        .update(update_data)
        .eq("id", appointment_id)
        .execute()
    )

    return result.data[0]


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

    supabase.table("appointments").delete().eq("id", appointment_id).execute()
