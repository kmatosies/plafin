"""
Middleware de controle de acesso por plano e limites.
Fornece dependências FastAPI reutilizáveis para:
  - Verificar se uma feature está disponível no plano do usuário
  - Verificar se o usuário não ultrapassou o limite de uso

Uso nos routers:
    Depends(require_feature("report_pdf_monthly"))
    Depends(require_limit("clients_total", "max_clients"))
"""

from fastapi import Depends, HTTPException, status
from app.middleware.auth import get_current_user
from app.database import get_supabase_admin
from app.config.plans import has_feature, get_limit, get_upgrade_message, PLAN_FREE
from app.services.usage_service import UsageService


async def _get_user_with_plan(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Dependência base que retorna o current_user com o campo 'plan' preenchido.
    Faz apenas UMA query ao banco por request.
    """
    supabase = get_supabase_admin()
    result = (
        supabase.table("profiles")
        .select("plan, subscription_status")
        .eq("id", current_user["id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Perfil de usuário não encontrado.",
        )

    plan = result.data.get("plan", PLAN_FREE)
    sub_status = result.data.get("subscription_status", "active")

    # Se assinatura cancelada/expirada, tratar como FREE
    if sub_status in ("canceled",) and plan != PLAN_FREE:
        plan = PLAN_FREE

    current_user["plan"] = plan
    current_user["subscription_status"] = sub_status
    return current_user


def require_feature(feature: str):
    """
    Factory de dependência FastAPI que bloqueia o endpoint
    se o plano do usuário não tiver a feature solicitada.

    Uso:
        @router.post("/report/pdf")
        async def generate_pdf(
            user = Depends(require_feature("report_pdf_monthly"))
        ):
            ...
    """
    async def check(current_user: dict = Depends(_get_user_with_plan)) -> dict:
        plan = current_user.get("plan", PLAN_FREE)
        if not has_feature(plan, feature):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=get_upgrade_message(plan, feature),
                headers={"X-Paywall-Feature": feature},
            )
        return current_user

    return check


def require_limit(metric: str, plan_limit_key: str):
    """
    Factory de dependência FastAPI que bloqueia o endpoint
    se o usuário já atingiu o limite do plano para a métrica.

    Parâmetros:
        metric: nome da métrica em usage_counters
                Ex: 'clients_total' | 'transactions_month'
        plan_limit_key: chave em PLAN_LIMITS para buscar o limite
                Ex: 'max_clients' | 'max_transactions_per_month'

    Uso:
        @router.post("/clients/")
        async def create_client(
            user = Depends(require_limit("clients_total", "max_clients"))
        ):
            ...
    """
    async def check(current_user: dict = Depends(_get_user_with_plan)) -> dict:
        user_id = current_user["id"]
        plan = current_user.get("plan", PLAN_FREE)

        limit = get_limit(plan, plan_limit_key)
        if limit is None:
            # Ilimitado — libera sem nenhuma query adicional
            return current_user

        # Definir o período correto para a métrica
        from datetime import datetime
        period = "all"
        if "month" in metric:
            period = datetime.utcnow().strftime("%Y-%m")

        current_count = UsageService.get_counter(user_id, metric, period)

        if current_count >= limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Você atingiu o limite de {limit} registro(s) para '{metric}' "
                    f"no plano {plan.upper()}. Faça upgrade para continuar."
                ),
                headers={
                    "X-Limit-Metric": metric,
                    "X-Limit-Max": str(limit),
                    "X-Limit-Current": str(current_count),
                },
            )

        return current_user

    return check
