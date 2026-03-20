"""
Router do Dashboard.
Dados agregados para o painel principal.

🛠 DEBUG: Este router usa logging estruturado.
  Em caso de erro, procure no terminal por:
    [plafin.dashboard] ERROR — Isso indica uma falha neste router.
  Exemplo de log de sucesso:
    [plafin.dashboard] INFO  Dashboard gerado para user=<uuid> em 45ms
"""

import logging
import time
from fastapi import APIRouter, Depends, Query, HTTPException, status
from datetime import date, datetime, timedelta
from app.middleware.auth import get_current_user
from app.database import get_supabase_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
logger = logging.getLogger("plafin.dashboard")


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
    t_start = time.perf_counter()
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    logger.info(f"Dashboard solicitado por user={user_id} | mês={month}/{year}")

    try:
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
        logger.info(f"Transações encontradas: {len(transactions)}")

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
            raw_date = t["date"]
            t_date = datetime.fromisoformat(raw_date.replace("Z", "+00:00")) if "T" in raw_date else datetime.fromisoformat(raw_date)
            week_idx = min((t_date.day - 1) // 7, 3)
            if t["type"] == "receita":
                weekly_trend[week_idx]["revenue"] += t["amount"]
            else:
                weekly_trend[week_idx]["expenses"] += t["amount"]

        # Últimas 5 transações
        latest_transactions = transactions[:5]

        # --- Contagens de clientes ativos ---
        clients_result = (
            supabase.table("clients")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("archived", False)
            .execute()
        )
        active_clients = clients_result.count or 0

        # --- Agendamentos de hoje ---
        today_str = datetime.now().strftime("%Y-%m-%d")
        today_start = f"{today_str}T00:00:00"
        today_end = f"{today_str}T23:59:59"

        today_apts_result = (
            supabase.table("appointments")
            # FIX: campo correto é "full_name", não "name"
            .select("*, clients(name)")
            .eq("user_id", user_id)
            .gte("date", today_start)
            .lte("date", today_end)
            .order("date")
            .execute()
        )

        appointments_today = []
        for item in (today_apts_result.data or []):
            client_data = item.pop("clients", None)
            # FIX: usar full_name ao invés de name
            item["client_name"] = client_data.get("name") if client_data else None
            appointments_today.append(item)

        logger.info(f"Agendamentos hoje: {len(appointments_today)}")

        # --- Alertas (vencimentos próximos 7 dias) ---
        next_week = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")

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

        elapsed = round((time.perf_counter() - t_start) * 1000)
        logger.info(f"Dashboard concluído para user={user_id} em {elapsed}ms")

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

    except Exception as e:
        # 🛠 DEBUG: log completo do erro para facilitar diagnóstico
        logger.error(f"Erro ao gerar dashboard para user={user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao carregar o dashboard: {str(e)}",
        )

