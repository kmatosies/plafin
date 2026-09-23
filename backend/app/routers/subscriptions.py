"""
Router de assinaturas (Stripe).
Expõe o contrato usado pelo frontend para status, checkout e portal.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal
from app.middleware.auth import get_current_user
from app.services.stripe_service import (
    create_checkout_session,
    create_portal_session,
)
from app.config.plans import PLAN_FREE, PLAN_PRO, PLAN_LIMITS, PLAN_FEATURES, normalize_plan

router = APIRouter(prefix="/subscriptions", tags=["Assinaturas"])
logger = logging.getLogger("plafin.subscriptions")


class CheckoutRequest(BaseModel):
    plan: Literal["pro"]
    billing_cycle: Literal["monthly"] = "monthly"


@router.get("/plans")
async def list_plans():
    """Retorna a lista de planos disponíveis com limites e features."""
    return {
        "plans": [
            {
                "id": PLAN_FREE,
                "name": "FREE",
                "price_monthly": 0,
                "limits": PLAN_LIMITS[PLAN_FREE],
                "features": sorted(list(PLAN_FEATURES[PLAN_FREE])),
            },
            {
                "id": PLAN_PRO,
                "name": "PRO",
                "price_monthly": None,
                "limits": PLAN_LIMITS[PLAN_PRO],
                "features": sorted(list(PLAN_FEATURES[PLAN_PRO])),
            },
        ]
    }


@router.get("/status")
async def get_subscription_status(
    current_user: dict = Depends(get_current_user),
):
    """Retorna o status atual da assinatura do usuário autenticado."""
    from app.database import get_supabase_admin
    from app.services.usage_service import UsageService
    from datetime import datetime, timezone

    supabase = get_supabase_admin()
    profile = (
        supabase.table("profiles")
        .select("plan, subscription_status, subscription_expires_at, stripe_subscription_id")
        .eq("id", current_user["id"])
        .execute()
    )

    if not profile.data:
        raise HTTPException(status_code=404, detail="Perfil não encontrado.")

    profile_data = profile.data[0]
    plan = normalize_plan(profile_data.get("plan", PLAN_FREE))
    period = datetime.now(timezone.utc).strftime("%Y-%m")

    # Buscar contadores de uso
    clients_count = UsageService.get_counter(current_user["id"], "clients_total", "all")
    transactions_count = UsageService.get_counter(
        current_user["id"], "transactions_month", period
    )

    return {
        "plan": plan,
        "subscription_status": profile_data.get("subscription_status", "active"),
        "subscription_expires_at": profile_data.get("subscription_expires_at"),
        "stripe_subscription_id": profile_data.get("stripe_subscription_id"),
        "limits": PLAN_LIMITS.get(plan, PLAN_LIMITS[PLAN_FREE]),
        "features": sorted(list(PLAN_FEATURES.get(plan, PLAN_FEATURES[PLAN_FREE]))),
        "usage": {
            "clients_total": clients_count,
            "transactions_month": transactions_count,
            "period": period,
        },
    }


@router.post("/create-checkout")
def create_checkout(
    data: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
):
    """Cria uma sessão de checkout do Stripe e retorna a URL."""
    try:
        url = create_checkout_session(
            user_id=current_user["id"],
            user_email=current_user["email"],
            plan=data.plan,
            billing_cycle=data.billing_cycle,
        )
        return {"checkout_url": url, "plan": data.plan, "billing_cycle": data.billing_cycle}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("Failed to create Stripe Checkout Session")
        raise HTTPException(status_code=502, detail="Servico de pagamento indisponivel.")

@router.post("/portal")
def customer_portal(
    current_user: dict = Depends(get_current_user),
):
    """Cria sessão do portal do cliente para gerenciar assinatura."""
    try:
        url = create_portal_session(user_id=current_user["id"])
        return {"portal_url": url}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("Failed to create Stripe Customer Portal Session")
        raise HTTPException(status_code=502, detail="Servico de pagamento indisponivel.")
