"""
Serviço de integração com o Stripe.
Gerencia sessões de checkout, portal do cliente e webhooks.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import stripe

from app.config import get_settings
from app.config.plans import PLAN_FREE, PLAN_PRO, PLAN_STARTER, normalize_plan
from app.database import get_supabase_admin
from app.middleware.access_control import invalidate_user_plan_cache

logger = logging.getLogger("plafin.stripe")

WEBHOOK_EVENTS_TABLE = "stripe_webhook_events"
ACTIVE_STATUSES = {"active", "trialing"}
PAST_DUE_STATUSES = {"past_due", "unpaid", "incomplete", "incomplete_expired"}
CANCELED_STATUSES = {"canceled"}


def _init_stripe() -> None:
    settings = get_settings()
    stripe.api_key = settings.stripe_secret_key


def _to_iso8601(timestamp: int | None) -> str | None:
    if not timestamp:
        return None
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()


def _normalize_subscription_status(status: str | None) -> str:
    if status in ACTIVE_STATUSES:
        return status or "active"
    if status in PAST_DUE_STATUSES:
        return "past_due"
    if status in CANCELED_STATUSES:
        return "canceled"
    return "active"


def _price_to_plan(price_id: str | None) -> str:
    settings = get_settings()
    if not price_id:
        return PLAN_FREE
    if price_id == settings.stripe_price_pro_monthly:
        return PLAN_PRO
    if price_id == settings.stripe_price_starter_monthly:
        return PLAN_STARTER
    return PLAN_FREE


def _get_profile_by_customer_id(customer_id: str | None) -> dict[str, Any] | None:
    if not customer_id:
        return None
    supabase = get_supabase_admin()
    result = (
        supabase.table("profiles")
        .select("id, plan, stripe_customer_id, stripe_subscription_id, stripe_price_id")
        .eq("stripe_customer_id", customer_id)
        .maybe_single()
        .execute()
    )
    return result.data


def _get_profile_by_user_id(user_id: str) -> dict[str, Any] | None:
    supabase = get_supabase_admin()
    result = (
        supabase.table("profiles")
        .select("id, plan, stripe_customer_id, stripe_subscription_id, stripe_price_id")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data


def _mark_event_processing(event_id: str, event_type: str) -> bool:
    supabase = get_supabase_admin()
    existing = (
        supabase.table(WEBHOOK_EVENTS_TABLE)
        .select("id, status")
        .eq("id", event_id)
        .maybe_single()
        .execute()
    )
    if existing.data and existing.data.get("status") == "processed":
        return False

    supabase.table(WEBHOOK_EVENTS_TABLE).upsert(
        {
            "id": event_id,
            "event_type": event_type,
            "status": "processing",
            "processed_at": None,
            "error_message": None,
        }
    ).execute()
    return True


def _mark_event_processed(event_id: str) -> None:
    supabase = get_supabase_admin()
    supabase.table(WEBHOOK_EVENTS_TABLE).update(
        {
            "status": "processed",
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "error_message": None,
        }
    ).eq("id", event_id).execute()


def _mark_event_failed(event_id: str, message: str) -> None:
    supabase = get_supabase_admin()
    supabase.table(WEBHOOK_EVENTS_TABLE).update(
        {
            "status": "failed",
            "error_message": message[:500],
            "processed_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", event_id).execute()


def _update_profile_subscription(user_id: str, update_data: dict[str, Any]) -> None:
    supabase = get_supabase_admin()
    supabase.table("profiles").update(update_data).eq("id", user_id).execute()
    invalidate_user_plan_cache(user_id)


def _resolve_user_id_from_sources(
    *,
    customer_id: str | None = None,
    subscription_data: dict[str, Any] | None = None,
    fallback_user_id: str | None = None,
) -> str | None:
    if fallback_user_id:
        return fallback_user_id

    metadata = (subscription_data or {}).get("metadata") or {}
    if metadata.get("user_id"):
        return metadata["user_id"]

    profile = _get_profile_by_customer_id(customer_id)
    if profile:
        return profile["id"]
    return None


def _extract_price_id_from_subscription(subscription: dict[str, Any]) -> str | None:
    items = subscription.get("items", {}).get("data", [])
    if not items:
        return None
    price = items[0].get("price") or {}
    return price.get("id")


def _sync_subscription_state(
    *,
    user_id: str,
    customer_id: str | None,
    subscription_id: str | None,
    status: str | None,
    current_period_end: int | None,
    price_id: str | None,
    plan: str | None = None,
) -> dict[str, Any]:
    current_profile = _get_profile_by_user_id(user_id) or {}
    if plan:
        effective_plan = normalize_plan(plan)
    elif price_id:
        effective_plan = normalize_plan(_price_to_plan(price_id))
    else:
        effective_plan = normalize_plan(current_profile.get("plan"))

    effective_status = _normalize_subscription_status(status)

    if effective_status == "canceled":
        effective_plan = PLAN_FREE
        subscription_id = None
        price_id = None
        current_period_end = None
    elif not price_id:
        price_id = current_profile.get("stripe_price_id")
    if not customer_id:
        customer_id = current_profile.get("stripe_customer_id")
    if not subscription_id and effective_status != "canceled":
        subscription_id = current_profile.get("stripe_subscription_id")

    update_data = {
        "plan": effective_plan,
        "stripe_customer_id": customer_id,
        "stripe_subscription_id": subscription_id,
        "stripe_price_id": price_id,
        "subscription_status": effective_status,
        "subscription_expires_at": _to_iso8601(current_period_end),
    }
    _update_profile_subscription(user_id, update_data)
    return update_data


def create_checkout_session(
    user_id: str,
    user_email: str,
    plan: str,
    billing_cycle: str = "monthly",
) -> str:
    """
    Cria uma sessão de checkout do Stripe.
    Retorna a URL de redirecionamento.
    """
    _init_stripe()
    settings = get_settings()

    # Definir o price_id baseado no plano e ciclo de cobrança
    # Por enquanto: somente mensal. Semiannual e annual ficam para versão futura.
    normalized_plan = normalize_plan(plan)
    if normalized_plan == "free":
        raise ValueError("Plano 'free' não pode ser contratado via checkout.")

    price_map = {
        PLAN_STARTER: {
            "monthly": settings.stripe_price_starter_monthly,
        },
        PLAN_PRO: {
            "monthly": settings.stripe_price_pro_monthly,
        },
    }

    plan_prices = price_map.get(normalized_plan)
    if not plan_prices:
        raise ValueError(f"Plano '{plan}' inválido. Use 'pro'.")

    price_id = plan_prices.get(billing_cycle)
    if not price_id:
        raise ValueError(f"Ciclo '{billing_cycle}' inválido para o plano '{normalized_plan}'.")

    # Verificar/criar customer no Stripe
    supabase = get_supabase_admin()
    profile = (
        supabase.table("profiles")
        .select("stripe_customer_id")
        .eq("id", user_id)
        .single()
        .execute()
    )

    customer_id = profile.data.get("stripe_customer_id") if profile.data else None

    if not customer_id:
        customer = stripe.Customer.create(
            email=user_email,
            metadata={"user_id": user_id},
        )
        customer_id = customer.id

        # Salvar customer_id no perfil
        supabase.table("profiles").update(
            {"stripe_customer_id": customer_id}
        ).eq("id", user_id).execute()

    # Criar sessão de checkout
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{settings.frontend_url_normalized}/dashboard?checkout=success",
        cancel_url=f"{settings.frontend_url_normalized}/assinatura?checkout=cancelled",
        metadata={
            "user_id": user_id,
            "plan": normalized_plan,
            "billing_cycle": billing_cycle,
            "price_id": price_id,
        },
        subscription_data={
            "metadata": {
                "user_id": user_id,
                "plan": normalized_plan,
                "billing_cycle": billing_cycle,
                "price_id": price_id,
            }
        },
    )

    logger.info(
        "Stripe checkout session criada: user_id=%s customer_id=%s session_id=%s plan=%s",
        user_id,
        customer_id,
        session.id,
        normalized_plan,
    )
    return session.url


def create_portal_session(user_id: str) -> str:
    """
    Cria uma sessão do portal do cliente para gerenciar assinatura.
    Permite: trocar cartão, cancelar, ver faturas.
    """
    _init_stripe()
    settings = get_settings()

    supabase = get_supabase_admin()
    profile = (
        supabase.table("profiles")
        .select("stripe_customer_id")
        .eq("id", user_id)
        .single()
        .execute()
    )

    customer_id = profile.data.get("stripe_customer_id") if profile.data else None
    if not customer_id:
        raise ValueError("Usuário não possui conta no Stripe.")

    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{settings.frontend_url_normalized}/dashboard",
    )

    return session.url


def _handle_checkout_session_completed(event: dict[str, Any]) -> dict[str, Any]:
    session = event["data"]["object"]
    metadata = session.get("metadata") or {}
    user_id = metadata.get("user_id")
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    plan = normalize_plan(metadata.get("plan"))
    price_id = metadata.get("price_id")

    if not user_id:
        raise ValueError("checkout.session.completed sem metadata.user_id.")

    if subscription_id:
        subscription = stripe.Subscription.retrieve(subscription_id)
        price_id = price_id or _extract_price_id_from_subscription(subscription)
        status = subscription.get("status")
        current_period_end = subscription.get("current_period_end")
    else:
        status = "active"
        current_period_end = None

    update_data = _sync_subscription_state(
        user_id=user_id,
        customer_id=customer_id,
        subscription_id=subscription_id,
        status=status,
        current_period_end=current_period_end,
        price_id=price_id,
        plan=plan,
    )
    return {"action": "checkout_session_completed", "user_id": user_id, "profile": update_data}


def _handle_invoice_payment_succeeded(event: dict[str, Any]) -> dict[str, Any]:
    invoice = event["data"]["object"]
    customer_id = invoice.get("customer")
    subscription_id = invoice.get("subscription")
    subscription = stripe.Subscription.retrieve(subscription_id) if subscription_id else None

    user_id = _resolve_user_id_from_sources(
        customer_id=customer_id,
        subscription_data=subscription,
    )
    if not user_id:
        raise ValueError("invoice.payment_succeeded sem vínculo com usuário.")

    price_id = None
    current_period_end = None
    status = "active"
    plan = None
    if subscription:
        price_id = _extract_price_id_from_subscription(subscription)
        current_period_end = subscription.get("current_period_end")
        status = subscription.get("status")
        plan = normalize_plan((subscription.get("metadata") or {}).get("plan"))
    else:
        lines = invoice.get("lines", {}).get("data", [])
        if lines:
            price_id = (lines[0].get("price") or {}).get("id")
            current_period_end = (lines[0].get("period") or {}).get("end")

    update_data = _sync_subscription_state(
        user_id=user_id,
        customer_id=customer_id,
        subscription_id=subscription_id,
        status=status,
        current_period_end=current_period_end,
        price_id=price_id,
        plan=plan,
    )
    return {"action": "invoice_payment_succeeded", "user_id": user_id, "profile": update_data}


def _handle_invoice_payment_failed(event: dict[str, Any]) -> dict[str, Any]:
    invoice = event["data"]["object"]
    customer_id = invoice.get("customer")
    profile = _get_profile_by_customer_id(customer_id)
    if not profile:
        raise ValueError("invoice.payment_failed sem customer conhecido.")

    update_data = {"subscription_status": "past_due"}
    _update_profile_subscription(profile["id"], update_data)
    return {"action": "invoice_payment_failed", "user_id": profile["id"], "profile": update_data}


def _handle_subscription_upsert(event: dict[str, Any]) -> dict[str, Any]:
    subscription = event["data"]["object"]
    customer_id = subscription.get("customer")
    user_id = _resolve_user_id_from_sources(
        customer_id=customer_id,
        subscription_data=subscription,
    )
    if not user_id:
        raise ValueError(f"{event['type']} sem vínculo com usuário.")

    price_id = _extract_price_id_from_subscription(subscription)
    update_data = _sync_subscription_state(
        user_id=user_id,
        customer_id=customer_id,
        subscription_id=subscription.get("id"),
        status=subscription.get("status"),
        current_period_end=subscription.get("current_period_end"),
        price_id=price_id,
        plan=normalize_plan((subscription.get("metadata") or {}).get("plan")),
    )
    return {"action": "subscription_upserted", "user_id": user_id, "profile": update_data}


def _handle_subscription_deleted(event: dict[str, Any]) -> dict[str, Any]:
    subscription = event["data"]["object"]
    customer_id = subscription.get("customer")
    user_id = _resolve_user_id_from_sources(
        customer_id=customer_id,
        subscription_data=subscription,
    )
    if not user_id:
        raise ValueError("customer.subscription.deleted sem vínculo com usuário.")

    update_data = _sync_subscription_state(
        user_id=user_id,
        customer_id=customer_id,
        subscription_id=subscription.get("id"),
        status="canceled",
        current_period_end=None,
        price_id=None,
        plan=PLAN_FREE,
    )
    return {"action": "subscription_deleted", "user_id": user_id, "profile": update_data}


def _handle_checkout_async_payment_failed(event: dict[str, Any]) -> dict[str, Any]:
    session = event["data"]["object"]
    user_id = (session.get("metadata") or {}).get("user_id")
    return {
        "action": "checkout_async_payment_failed",
        "user_id": user_id,
        "session_id": session.get("id"),
    }


def construct_webhook_event(payload: bytes, sig_header: str) -> dict[str, Any]:
    _init_stripe()
    settings = get_settings()

    if not settings.stripe_webhook_secret:
        raise ValueError("STRIPE_WEBHOOK_SECRET não configurada.")
    if not sig_header:
        raise ValueError("Cabeçalho Stripe-Signature ausente.")

    try:
        return stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=settings.stripe_webhook_secret,
        )
    except ValueError as exc:
        raise ValueError("Payload de webhook inválido.") from exc
    except stripe.error.SignatureVerificationError as exc:
        raise ValueError("Assinatura do webhook inválida.") from exc


def handle_webhook_event(payload: bytes, sig_header: str) -> dict[str, Any]:
    event = construct_webhook_event(payload, sig_header)
    event_id = event["id"]
    event_type = event["type"]

    logger.info("Stripe webhook recebido: event_id=%s type=%s", event_id, event_type)

    should_process = _mark_event_processing(event_id, event_type)
    if not should_process:
        logger.info("Stripe webhook duplicado ignorado: event_id=%s type=%s", event_id, event_type)
        return {"action": "duplicate_ignored", "event_id": event_id, "type": event_type}

    try:
        if event_type == "checkout.session.completed":
            result = _handle_checkout_session_completed(event)
        elif event_type in {"invoice.payment_succeeded", "invoice.paid"}:
            result = _handle_invoice_payment_succeeded(event)
        elif event_type == "invoice.payment_failed":
            result = _handle_invoice_payment_failed(event)
        elif event_type in {"customer.subscription.created", "customer.subscription.updated"}:
            result = _handle_subscription_upsert(event)
        elif event_type == "customer.subscription.deleted":
            result = _handle_subscription_deleted(event)
        elif event_type == "checkout.session.async_payment_failed":
            result = _handle_checkout_async_payment_failed(event)
        else:
            result = {"action": "unhandled", "event_id": event_id, "type": event_type}

        _mark_event_processed(event_id)
        logger.info(
            "Stripe webhook processado com sucesso: event_id=%s type=%s action=%s",
            event_id,
            event_type,
            result.get("action"),
        )
        return {"event_id": event_id, "type": event_type, **result}
    except Exception as exc:
        _mark_event_failed(event_id, str(exc))
        logger.exception(
            "Falha ao processar webhook Stripe: event_id=%s type=%s",
            event_id,
            event_type,
        )
        raise
