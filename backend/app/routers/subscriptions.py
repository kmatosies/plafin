"""
Router de assinaturas (Stripe) — Versão 2.
Suporta planos: starter | pro (mensal apenas por enquanto).
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from typing import Literal
from app.middleware.auth import get_current_user
from app.services.stripe_service import (
    create_checkout_session,
    create_portal_session,
    handle_webhook_event,
)
from app.config.plans import PLAN_HIERARCHY, PLAN_STARTER, PLAN_PRO

router = APIRouter(prefix="/subscriptions", tags=["Assinaturas"])


class CheckoutRequest(BaseModel):
    plan: Literal["starter", "pro"]
    billing_cycle: Literal["monthly"] = "monthly"  # Somente mensal por enquanto


@router.get("/plans")
async def list_plans():
    """Retorna a lista de planos disponíveis com limites e features."""
    from app.config.plans import PLAN_LIMITS, PLAN_FEATURES, PLAN_FREE
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
                "id": PLAN_STARTER,
                "name": "STARTER",
                "price_monthly": None,  # Vindo do Stripe
                "limits": PLAN_LIMITS[PLAN_STARTER],
                "features": sorted(list(PLAN_FEATURES[PLAN_STARTER])),
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
    from app.config.plans import PLAN_LIMITS, PLAN_FEATURES
    from app.services.usage_service import UsageService
    from datetime import datetime

    supabase = get_supabase_admin()
    profile = (
        supabase.table("profiles")
        .select("plan, subscription_status, subscription_expires_at, stripe_subscription_id")
        .eq("id", current_user["id"])
        .single()
        .execute()
    )

    if not profile.data:
        raise HTTPException(status_code=404, detail="Perfil não encontrado.")

    plan = profile.data.get("plan", "free")
    period = datetime.utcnow().strftime("%Y-%m")

    # Buscar contadores de uso
    clients_count = UsageService.get_counter(current_user["id"], "clients_total", "all")
    transactions_count = UsageService.get_counter(
        current_user["id"], "transactions_month", period
    )

    return {
        "plan": plan,
        "subscription_status": profile.data.get("subscription_status", "active"),
        "subscription_expires_at": profile.data.get("subscription_expires_at"),
        "stripe_subscription_id": profile.data.get("stripe_subscription_id"),
        "limits": PLAN_LIMITS.get(plan, PLAN_LIMITS["free"]),
        "features": sorted(list(PLAN_FEATURES.get(plan, PLAN_FEATURES["free"]))),
        "usage": {
            "clients_total": clients_count,
            "transactions_month": transactions_count,
            "period": period,
        },
    }


@router.post("/create-checkout")
async def create_checkout(
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
        return {"checkout_url": url}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar checkout: {str(e)}")


@router.post("/portal")
async def customer_portal(
    current_user: dict = Depends(get_current_user),
):
    """Cria sessão do portal do cliente para gerenciar assinatura."""
    try:
        url = create_portal_session(user_id=current_user["id"])
        return {"portal_url": url}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar portal: {str(e)}")


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Recebe eventos de webhook do Stripe.
    Configure o endpoint no Dashboard do Stripe:
    POST https://seudominio.com/api/subscriptions/webhook
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        result = handle_webhook_event(payload, sig_header)
        return {"status": "ok", **result}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no webhook: {str(e)}")
