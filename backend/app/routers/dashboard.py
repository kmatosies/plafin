"""
Router do Dashboard.
Dados agregados para o painel principal.
"""

from fastapi import APIRouter, Depends, Query
from datetime import date, datetime, timedelta
from app.middleware.auth import get_current_user
from app.database import get_supabase_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/")
async def get_dashboard_data(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Retorna todos os dados necessários para o dashboard em uma única chamada.
    Inclui: resumo financeiro, contagens, tendência semanal, últimas transações,
    agendamentos de hoje e alertas.
    """
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    # --- Período do mês ---
    start_date = date(year, month, 1).isoformat()
    if month == 12:
        end_date = date(year + 1, 1, 1).isoformat()
    else:
        end_date = date(year, month + 1, 1).isoformat()

    # --- Transações do mês ---
    tx_result = (
        supabase.table("transactions")
        .select("*")
        .eq("user_id", user_id)
        .gte("date", start_date)
        .lt("date", end_date)
        .order("date", desc=True)
        .execute()
    )
    transactions = tx_result.data or []

    revenue = sum(t["amount"] for t in transactions if t["type"] == "receita")
    expenses = sum(t["amount"] for t in transactions if t["type"] == "despesa")
    pending = sum(
        t["amount"] for t in transactions
        if t["status"] == "pendente"
    )

    # Tendência semanal (4 semanas)
    weekly_trend = [
        {"week": f"S{i+1}", "revenue": 0.0, "expenses": 0.0}
        for i in range(4)
    ]
    for t in transactions:
        t_date = datetime.fromisoformat(t["date"]) if "T" not in t["date"] else datetime.fromisoformat(t["date"])
        day = t_date.day
        week_idx = min((day - 1) // 7, 3)
        if t["type"] == "receita":
            weekly_trend[week_idx]["revenue"] += t["amount"]
        else:
            weekly_trend[week_idx]["expenses"] += t["amount"]

    # Últimas 5 transações
    latest_transactions = transactions[:5]

    # --- Contagens ---
    clients_result = (
        supabase.table("clients")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("archived", False)
        .execute()
    )
    active_clients = clients_result.count or 0

    # --- Agendamentos de hoje ---
    today_start = datetime.now().replace(hour=0, minute=0, second=0).isoformat()
    today_end = datetime.now().replace(hour=23, minute=59, second=59).isoformat()

    today_appointments = (
        supabase.table("appointments")
        .select("*, clients(name)")
        .eq("user_id", user_id)
        .gte("date", today_start)
        .lte("date", today_end)
        .order("date")
        .execute()
    )

    appointments_today = []
    for item in (today_appointments.data or []):
        client_data = item.pop("clients", None)
        item["client_name"] = client_data["name"] if client_data else None
        appointments_today.append(item)

    # --- Alertas (vencimentos próximos 7 dias) ---
    next_week = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    today_str = datetime.now().strftime("%Y-%m-%d")

    alerts_result = (
        supabase.table("transactions")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "pendente")
        .gte("date", today_str)
        .lte("date", next_week)
        .order("date")
        .execute()
    )

    return {
        "financial_summary": {
            "total_revenue": revenue,
            "total_expenses": expenses,
            "net_profit": revenue - expenses,
            "pending_total": pending,
            "transaction_count": len(transactions),
        },
        "weekly_trend": weekly_trend,
        "latest_transactions": latest_transactions,
        "active_clients": active_clients,
        "appointments_today": appointments_today,
        "upcoming_alerts": alerts_result.data or [],
    }
