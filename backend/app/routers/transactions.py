"""
Router de transações financeiras.
CRUD completo com filtros por mês, tipo e status.
Verifica limite mensal do plano ao criar nova transação.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from datetime import date, datetime
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    FinancialSummary,
)
from app.middleware.auth import get_current_user
from app.middleware.access_control import require_limit
from app.database import get_supabase_admin
from app.services.usage_service import UsageService

router = APIRouter(prefix="/transactions", tags=["Transações"])


@router.get("/", response_model=list[TransactionResponse])
async def list_transactions(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    type: Optional[str] = Query(None, regex="^(receita|despesa)$"),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
):
    """Lista transações com filtros opcionais."""
    supabase = get_supabase_admin()
    query = supabase.table("transactions").select("*").eq("user_id", current_user["id"])

    if month and year:
        start_date = date(year, month, 1).isoformat()
        if month == 12:
            end_date = date(year + 1, 1, 1).isoformat()
        else:
            end_date = date(year, month + 1, 1).isoformat()
        query = query.gte("date", start_date).lt("date", end_date)

    if type:
        query = query.eq("type", type)

    if status_filter:
        query = query.eq("status", status_filter)

    result = query.order("date", desc=True).execute()
    return result.data or []


@router.get("/summary", response_model=FinancialSummary)
async def get_summary(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    current_user: dict = Depends(get_current_user),
):
    """Retorna resumo financeiro do mês."""
    supabase = get_supabase_admin()

    start_date = date(year, month, 1).isoformat()
    if month == 12:
        end_date = date(year + 1, 1, 1).isoformat()
    else:
        end_date = date(year, month + 1, 1).isoformat()

    result = (
        supabase.table("transactions")
        .select("*")
        .eq("user_id", current_user["id"])
        .gte("date", start_date)
        .lt("date", end_date)
        .execute()
    )

    transactions = result.data or []

    revenue = sum(t["amount"] for t in transactions if t["type"] == "receita")
    expenses = sum(t["amount"] for t in transactions if t["type"] == "despesa")
    pending_rev = sum(
        t["amount"] for t in transactions
        if t["type"] == "receita" and t["status"] == "pendente"
    )
    pending_exp = sum(
        t["amount"] for t in transactions
        if t["type"] == "despesa" and t["status"] == "pendente"
    )

    return FinancialSummary(
        total_revenue=revenue,
        total_expenses=expenses,
        net_profit=revenue - expenses,
        pending_receivables=pending_rev,
        pending_payables=pending_exp,
        transaction_count=len(transactions),
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Busca uma transação específica."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("transactions")
        .select("*")
        .eq("id", transaction_id)
        .eq("user_id", current_user["id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Transação não encontrada.")

    return result.data


@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    data: TransactionCreate,
    # require_limit verifica o limite mensal de transações do plano
    current_user: dict = Depends(
        require_limit("transactions_month", "max_transactions_per_month")
    ),
):
    """Cria uma nova transação (com verificação de limite mensal do plano)."""
    supabase = get_supabase_admin()
    transaction_data = data.model_dump()
    transaction_data["user_id"] = current_user["id"]
    transaction_data["date"] = transaction_data["date"].isoformat()

    result = supabase.table("transactions").insert(transaction_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Erro ao criar transação.")

    # Incrementar contador do mês corrente atomicamente
    period = datetime.utcnow().strftime("%Y-%m")
    UsageService.increment_counter(current_user["id"], "transactions_month", period)

    return result.data[0]


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    data: TransactionUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Atualiza uma transação existente."""
    supabase = get_supabase_admin()

    # Verificar se pertence ao usuário
    existing = (
        supabase.table("transactions")
        .select("id")
        .eq("id", transaction_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Transação não encontrada.")

    update_data = data.model_dump(exclude_unset=True)
    if "date" in update_data and update_data["date"]:
        update_data["date"] = update_data["date"].isoformat()

    result = (
        supabase.table("transactions")
        .update(update_data)
        .eq("id", transaction_id)
        .execute()
    )

    return result.data[0]


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove uma transação."""
    supabase = get_supabase_admin()

    existing = (
        supabase.table("transactions")
        .select("id, date")
        .eq("id", transaction_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Transação não encontrada.")

    supabase.table("transactions").delete().eq("id", transaction_id).execute()

    # Decrementar o contador do mês da transação deletada
    tx_date = existing.data[0].get("date", "")
    if tx_date:
        # Extrair o período YYYY-MM da data da transação
        period = tx_date[:7]  # Ex: '2026-03'
        UsageService.decrement_counter(current_user["id"], "transactions_month", period)
