"""
Middleware de controle de acesso por plano e limites.
Fornece dependências FastAPI reutilizáveis para:
  - Verificar se uma feature está disponível no plano do usuário
  - Verificar se o usuário não ultrapassou o limite de uso

Uso nos routers:
    Depends(require_feature("report_pdf_monthly"))
    Depends(require_limit("clients_total", "max_clients"))
"""

import asyncio
from datetime import datetime
from time import monotonic

from fastapi import Depends, HTTPException, status

from app.config.plans import has_feature, get_limit, get_upgrade_message, PLAN_FREE, normalize_plan
from app.database import get_supabase_admin
from app.middleware.auth import get_current_user
from app.services.usage_service import UsageService

_PROFILE_CACHE_TTL_SECONDS = 300
_profile_cache: dict[str, tuple[float, dict[str, str]]] = {}
_profile_cache_lock = asyncio.Lock()


def invalidate_user_plan_cache(user_id: str) -> None:
    """
    Invalida o cache de plano/assinatura do usuário.
    Pode ser chamado por webhooks (ex: Stripe) quando houver upgrade/downgrade.
    """
    _profile_cache.pop(str(user_id), None)


def _get_cached_user_plan(user_id: str) -> dict[str, str] | None:
    cached_entry = _profile_cache.get(user_id)
    if not cached_entry:
        return None

    expires_at, profile_data = cached_entry
    if expires_at <= monotonic():
        _profile_cache.pop(user_id, None)
        return None

    return profile_data.copy()


def _set_cached_user_plan(user_id: str, profile_data: dict[str, str]) -> None:
    _profile_cache[user_id] = (
        monotonic() + _PROFILE_CACHE_TTL_SECONDS,
        profile_data.copy(),
    )


def _fetch_user_plan_profile(user_id: str):
    supabase = get_supabase_admin()
    return (
        supabase.table("profiles")
        .select("plan, subscription_status")
        .eq("id", user_id)
        .single()
        .execute()
    )


async def _get_user_with_plan(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Dependência base que retorna o current_user com o campo 'plan' preenchido.
    Faz apenas UMA query ao banco por request quando o cache está expirado.
    """
    user_id = str(current_user["id"])
    cached_profile = _get_cached_user_plan(user_id)

    if cached_profile is None:
        async with _profile_cache_lock:
            cached_profile = _get_cached_user_plan(user_id)
            if cached_profile is None:
                result = await asyncio.to_thread(_fetch_user_plan_profile, user_id)

                if not result.data:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Perfil de usuário não encontrado.",
                    )

                cached_profile = {
                    "plan": result.data.get("plan", PLAN_FREE),
                    "subscription_status": result.data.get("subscription_status", "active"),
                }
                _set_cached_user_plan(user_id, cached_profile)

    plan = normalize_plan(cached_profile.get("plan", PLAN_FREE))
    sub_status = cached_profile.get("subscription_status", "active")

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
