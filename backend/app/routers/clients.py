"""
Router de clientes/contatos.
CRUD completo com suporte a arquivamento e controle de limite de plano.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from app.schemas.client import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
)
from app.middleware.auth import get_current_user
from app.middleware.access_control import require_limit
from app.database import get_supabase_admin
from app.services.usage_service import UsageService

router = APIRouter(prefix="/clients", tags=["Clientes"])


@router.get("/", response_model=list[ClientResponse])
async def list_clients(
    archived: Optional[bool] = Query(False),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Lista clientes com filtro de arquivados e busca por nome."""
    supabase = get_supabase_admin()
    query = (
        supabase.table("clients")
        .select("*")
        .eq("user_id", current_user["id"])
        .eq("archived", archived)
    )

    if search:
        query = query.ilike("name", f"%{search}%")

    result = query.order("name").execute()
    return result.data or []


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Busca um cliente específico."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("clients")
        .select("*")
        .eq("id", client_id)
        .eq("user_id", current_user["id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    return result.data


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    data: ClientCreate,
    # require_limit verifica se o usuário não atingiu o limite de clientes do plano
    current_user: dict = Depends(require_limit("clients_total", "max_clients")),
):
    """Cria um novo cliente (com verificação de limite de plano)."""
    supabase = get_supabase_admin()
    client_data = data.model_dump()
    client_data["user_id"] = current_user["id"]

    result = supabase.table("clients").insert(client_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Erro ao criar cliente.")

    # Incrementar contador atomicamente
    UsageService.increment_counter(current_user["id"], "clients_total", "all")

    return result.data[0]


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    data: ClientUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Atualiza um cliente existente."""
    supabase = get_supabase_admin()

    existing = (
        supabase.table("clients")
        .select("id")
        .eq("id", client_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    update_data = data.model_dump(exclude_unset=True)
    result = (
        supabase.table("clients")
        .update(update_data)
        .eq("id", client_id)
        .execute()
    )

    return result.data[0]


@router.patch("/{client_id}/archive")
async def archive_client(
    client_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Arquiva um cliente."""
    supabase = get_supabase_admin()

    existing = (
        supabase.table("clients")
        .select("id")
        .eq("id", client_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    supabase.table("clients").update({"archived": True}).eq("id", client_id).execute()
    return {"message": "Cliente arquivado com sucesso."}


@router.patch("/{client_id}/reactivate")
async def reactivate_client(
    client_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Reativa um cliente arquivado."""
    supabase = get_supabase_admin()

    existing = (
        supabase.table("clients")
        .select("id")
        .eq("id", client_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    supabase.table("clients").update({"archived": False}).eq("id", client_id).execute()
    return {"message": "Cliente reativado com sucesso."}


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove um cliente permanentemente."""
    supabase = get_supabase_admin()

    existing = (
        supabase.table("clients")
        .select("id")
        .eq("id", client_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    supabase.table("clients").delete().eq("id", client_id).execute()

    # Decrementar contador atomicamente
    UsageService.decrement_counter(current_user["id"], "clients_total", "all")
