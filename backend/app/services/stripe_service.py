"""
Serviço de integração com o Stripe.
Gerencia sessões de checkout, portal do cliente e webhooks.
"""

from __future__ import annotations

import logging
import secrets
import string
from datetime import datetime, timezone
from typing import Any

import stripe

from app.config import get_settings
from app.config.plans import PLAN_FREE, PLAN_PRO, normalize_plan
from app.database import get_supabase_admin
from app.middleware.access_control import invalidate_user_plan_cache

logger = logging.getLogger("plafin.stripe")

WEBHOOK_EVENTS_TABLE = "stripe_webhook_events"
ACTIVE_STATUSES = {"active", "trialing"}
PAST_DUE_STATUSES = {"past_due", "unpaid", "incomplete", "incomplete_expired"}
CANCELED_STATUSES = {"canceled"}


def _get_stripe_client() -> stripe.StripeClient:
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise ValueError("Stripe integration is not configured.")
    return stripe.StripeClient(settings.stripe_secret_key)


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
        raise ValueError("Stripe subscription has no Price ID.")
    if price_id == settings.stripe_price_pro_monthly_brl:
        return PLAN_PRO
    raise ValueError("Stripe subscription uses an unknown Price ID.")


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
        .select(
            "id, plan, subscription_status, stripe_customer_id, "
            "stripe_subscription_id, stripe_price_id"
        )
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data


def _mark_event_processing(event_id: str, event_type: str) -> bool:
    supabase = get_supabase_admin()
    result = supabase.rpc(
        "reserve_stripe_webhook_event",
        {"p_event_id": event_id, "p_event_type": event_type},
    ).execute()
    claimed = result.data
    if isinstance(claimed, list):
        claimed = claimed[0] if claimed else False
    return claimed is True


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


def _update_profile_subscription(
    user_id: str,
    update_data: dict[str, Any],
    *,
    expected_customer_id: str | None,
    expected_subscription_id: str | None,
) -> bool:
    """Update only the billing binding that was read before processing the event."""
    supabase = get_supabase_admin()
    query = supabase.table("profiles").update(update_data).eq("id", user_id)
    if expected_customer_id is None:
        query = query.is_("stripe_customer_id", "null")
    else:
        query = query.eq("stripe_customer_id", expected_customer_id)
    if expected_subscription_id is None:
        query = query.is_("stripe_subscription_id", "null")
    else:
        query = query.eq("stripe_subscription_id", expected_subscription_id)
    updated = query.select("id").execute().data
    if updated:
        invalidate_user_plan_cache(user_id)
    return bool(updated)


def _resolve_user_id_from_sources(
    *,
    customer_id: str | None = None,
    subscription_data: dict[str, Any] | None = None,
    fallback_user_id: str | None = None,
) -> str | None:
    metadata = (subscription_data or {}).get("metadata") or {}
    metadata_user_id = metadata.get("user_id") or fallback_user_id
    profile = _get_profile_by_customer_id(customer_id)
    if profile:
        if metadata_user_id and metadata_user_id != profile["id"]:
            raise ValueError("Stripe customer and metadata user do not match.")
        return profile["id"]
    if metadata_user_id:
        metadata_profile = _get_profile_by_user_id(metadata_user_id)
        if not metadata_profile or metadata_profile.get("stripe_customer_id") != customer_id:
            raise ValueError("Stripe metadata user is not bound to the customer.")
    return metadata_user_id


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
    allow_rebind_after_cancel: bool = False,
) -> dict[str, Any]:
    if not customer_id or not subscription_id:
        raise ValueError("Stripe event has no verifiable customer/subscription binding.")
    current_profile = _get_profile_by_user_id(user_id) or {}
    bound_customer_id = current_profile.get("stripe_customer_id")
    bound_subscription_id = current_profile.get("stripe_subscription_id")
    if not current_profile:
        raise ValueError("Stripe event user has no profile.")
    if bound_customer_id and customer_id != bound_customer_id:
        raise ValueError("Stripe event customer differs from the current profile.")
    if bound_subscription_id and subscription_id != bound_subscription_id:
        raise ValueError("Stripe event subscription differs from the current profile.")
    if (
        not bound_subscription_id
        and current_profile.get("subscription_status") == "canceled"
        and status != "canceled"
        and not allow_rebind_after_cancel
    ):
        raise ValueError("Canceled subscription requires a verified new checkout or reconciliation.")
    effective_status = _normalize_subscription_status(status)

    if effective_status == "canceled":
        effective_plan = PLAN_FREE
        subscription_id = None
        price_id = None
        current_period_end = None
    elif not price_id:
        price_id = current_profile.get("stripe_price_id")
        effective_plan = _price_to_plan(price_id)
    else:
        effective_plan = _price_to_plan(price_id)
    update_data = {
        "plan": effective_plan,
        "stripe_customer_id": customer_id,
        "stripe_subscription_id": subscription_id,
        "stripe_price_id": price_id,
        "subscription_status": effective_status,
        "subscription_expires_at": _to_iso8601(current_period_end),
    }
    if not _update_profile_subscription(
        user_id,
        update_data,
        expected_customer_id=bound_customer_id,
        expected_subscription_id=bound_subscription_id,
    ):
        raise ValueError("Stripe subscription binding changed; reconciliation required.")
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
    stripe_client = _get_stripe_client()
    settings = get_settings()

    # Definir o price_id baseado no plano e ciclo de cobrança
    # Por enquanto: somente mensal. Semiannual e annual ficam para versão futura.
    normalized_plan = normalize_plan(plan)
    if normalized_plan == "free":
        raise ValueError("Plano 'free' não pode ser contratado via checkout.")

    price_map = {PLAN_PRO: {"monthly": settings.stripe_price_pro_monthly_brl}}

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
        customer = stripe_client.v1.customers.create(
            {"email": user_email, "metadata": {"user_id": user_id}},
        )
        customer_id = customer.id

        # Salvar customer_id no perfil
        supabase.table("profiles").update(
            {"stripe_customer_id": customer_id}
        ).eq("id", user_id).execute()

    # Criar sessão de checkout
    integration_suffix = "".join(
        secrets.choice(string.ascii_lowercase) for _ in range(8)
    )
    session = stripe_client.v1.checkout.sessions.create(
        {
            "customer": customer_id,
            "line_items": [{"price": price_id, "quantity": 1}],
            "mode": "subscription",
            "success_url": f"{settings.frontend_url_normalized}/dashboard?checkout=success",
            "cancel_url": f"{settings.frontend_url_normalized}/assinatura?checkout=cancelled",
            "integration_identifier": f"plafin_checkout_{integration_suffix}",
            "metadata": {
                "user_id": user_id,
                "plan": normalized_plan,
                "billing_cycle": billing_cycle,
                "price_id": price_id,
            },
            "subscription_data": {
                "metadata": {
                    "user_id": user_id,
                    "plan": normalized_plan,
                    "billing_cycle": billing_cycle,
                    "price_id": price_id,
                }
            },
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
    stripe_client = _get_stripe_client()
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

    session = stripe_client.v1.billing_portal.sessions.create(
        {
            "customer": customer_id,
            "return_url": f"{settings.frontend_url_normalized}/dashboard",
        }
    )

    return session.url


def _handle_checkout_session_completed(event: dict[str, Any]) -> dict[str, Any]:
    session = event["data"]["object"]
    metadata = session.get("metadata") or {}
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    user_id = _resolve_user_id_from_sources(
        customer_id=customer_id,
        fallback_user_id=metadata.get("user_id"),
    )

    if not user_id:
        raise ValueError("checkout.session.completed sem metadata.user_id.")

    if subscription_id:
        subscription = _get_stripe_client().v1.subscriptions.retrieve(subscription_id)
        if subscription.get("customer") != customer_id:
            raise ValueError("Checkout customer and subscription customer do not match.")
        price_id = _extract_price_id_from_subscription(subscription)
        status = subscription.get("status")
        current_period_end = subscription.get("current_period_end")
    else:
        raise ValueError("checkout.session.completed sem subscription.")

    update_data = _sync_subscription_state(
        user_id=user_id,
        customer_id=customer_id,
        subscription_id=subscription_id,
        status=status,
        current_period_end=current_period_end,
        price_id=price_id,
        allow_rebind_after_cancel=True,
    )
    return {"action": "checkout_session_completed", "user_id": user_id, "profile": update_data}


def _handle_invoice_payment_succeeded(event: dict[str, Any]) -> dict[str, Any]:
    invoice = event["data"]["object"]
    customer_id = invoice.get("customer")
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        raise ValueError("invoice.payment_succeeded sem subscription verificável.")
    subscription = _get_stripe_client().v1.subscriptions.retrieve(subscription_id)
    if subscription.get("customer") != customer_id:
        raise ValueError("Invoice customer and subscription customer do not match.")

    user_id = _resolve_user_id_from_sources(
        customer_id=customer_id,
        subscription_data=subscription,
    )
    if not user_id:
        raise ValueError("invoice.payment_succeeded sem vínculo com usuário.")

    price_id = _extract_price_id_from_subscription(subscription)
    current_period_end = subscription.get("current_period_end")
    status = subscription.get("status")

    update_data = _sync_subscription_state(
        user_id=user_id,
        customer_id=customer_id,
        subscription_id=subscription_id,
        status=status,
        current_period_end=current_period_end,
        price_id=price_id,
    )
    return {"action": "invoice_payment_succeeded", "user_id": user_id, "profile": update_data}


def _handle_invoice_payment_failed(event: dict[str, Any]) -> dict[str, Any]:
    invoice = event["data"]["object"]
    customer_id = invoice.get("customer")
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        raise ValueError("invoice.payment_failed sem subscription verificável.")
    profile = _get_profile_by_customer_id(customer_id)
    if not profile:
        raise ValueError("invoice.payment_failed sem customer conhecido.")

    if profile.get("stripe_subscription_id") != subscription_id:
        return {"action": "invoice_payment_failed_ignored", "user_id": profile["id"]}
    update_data = {"subscription_status": "past_due"}
    if not _update_profile_subscription(
        profile["id"],
        update_data,
        expected_customer_id=customer_id,
        expected_subscription_id=subscription_id,
    ):
        raise ValueError("Stripe subscription binding changed; reconciliation required.")
    return {"action": "invoice_payment_failed", "user_id": profile["id"], "profile": update_data}


def _handle_subscription_upsert(event: dict[str, Any]) -> dict[str, Any]:
    subscription = event["data"]["object"]
    customer_id = subscription.get("customer")
    subscription_id = subscription.get("id")
    if not customer_id or not subscription_id:
        raise ValueError("Subscription event has no customer/subscription binding.")
    user_id = _resolve_user_id_from_sources(
        customer_id=customer_id,
        subscription_data=subscription,
    )
    if not user_id:
        raise ValueError(f"{event['type']} sem vínculo com usuário.")

    canonical = _get_stripe_client().v1.subscriptions.retrieve(subscription_id)
    if canonical.get("id") != subscription_id or canonical.get("customer") != customer_id:
        raise ValueError("Subscription event differs from canonical Stripe subscription.")
    status = canonical.get("status")
    if not status:
        raise ValueError("Canonical Stripe subscription has no status.")
    price_id = _extract_price_id_from_subscription(canonical)
    update_data = _sync_subscription_state(
        user_id=user_id,
        customer_id=customer_id,
        subscription_id=subscription_id,
        status=status,
        current_period_end=canonical.get("current_period_end"),
        price_id=price_id,
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

    profile = _get_profile_by_user_id(user_id)
    if not profile or profile.get("stripe_subscription_id") != subscription.get("id"):
        return {"action": "subscription_deleted_ignored", "user_id": user_id}

    update_data = _sync_subscription_state(
        user_id=user_id,
        customer_id=customer_id,
        subscription_id=subscription.get("id"),
        status="canceled",
        current_period_end=None,
        price_id=None,
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
