"""
Serviço de integração com o Stripe.
Gerencia sessões de checkout, assinaturas e webhooks.
"""

import stripe
from app.config import get_settings
from app.database import get_supabase_admin
from app.config.plans import PLAN_PRO, PLAN_STARTER, normalize_plan


def _init_stripe():
    """Inicializa a chave do Stripe."""
    settings = get_settings()
    stripe.api_key = settings.stripe_secret_key


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
        success_url=f"{settings.frontend_url}/dashboard?checkout=success",
        cancel_url=f"{settings.frontend_url}/assinatura?checkout=cancelled",
        metadata={
            "user_id": user_id,
            "plan": normalized_plan,
            "billing_cycle": billing_cycle,
        },
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
        return_url=f"{settings.frontend_url}/dashboard",
    )

    return session.url


def handle_webhook_event(payload: bytes, sig_header: str) -> dict:
    """
    Processa eventos de webhook do Stripe.
    Retorna os dados processados.
    """
    _init_stripe()
    settings = get_settings()

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except stripe.error.SignatureVerificationError:
        raise ValueError("Assinatura do webhook inválida.")

    supabase = get_supabase_admin()

    # Processar eventos relevantes
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"]["user_id"]
        plan = normalize_plan(session["metadata"]["plan"])
        subscription_id = session.get("subscription")

        # Buscar detalhes da assinatura para obter data de expiração
        expires_at = None
        if subscription_id:
            import stripe as _stripe
            sub = _stripe.Subscription.retrieve(subscription_id)
            import datetime
            expires_at = datetime.datetime.utcfromtimestamp(
                sub["current_period_end"]
            ).isoformat()

        supabase.table("profiles").update({
            "plan": plan,
            "stripe_subscription_id": subscription_id,
            "subscription_status": "active",
            "subscription_expires_at": expires_at,
        }).eq("id", user_id).execute()

        return {"action": "subscription_created", "plan": plan}

    elif event["type"] == "invoice.paid":
        invoice = event["data"]["object"]
        customer_id = invoice["customer"]

        # Buscar usuário pelo customer_id
        profile = (
            supabase.table("profiles")
            .select("id")
            .eq("stripe_customer_id", customer_id)
            .single()
            .execute()
        )

        if profile.data:
            # Renovar a data de expiração com base no período da fatura
            import datetime
            period_end = invoice.get("lines", {}).get("data", [{}])[0].get(
                "period", {}
            ).get("end")
            expires_at = (
                datetime.datetime.utcfromtimestamp(period_end).isoformat()
                if period_end
                else None
            )
            update_data = {
                "subscription_status": "active",
            }
            if expires_at:
                update_data["subscription_expires_at"] = expires_at

            supabase.table("profiles").update(update_data).eq(
                "id", profile.data["id"]
            ).execute()
            return {"action": "invoice_paid", "user_id": profile.data["id"]}

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        customer_id = subscription["customer"]

        # Downgrade para free, mantém todos os dados
        profile = (
            supabase.table("profiles")
            .select("id")
            .eq("stripe_customer_id", customer_id)
            .single()
            .execute()
        )

        if profile.data:
            supabase.table("profiles").update({
                "plan": "free",
                "stripe_subscription_id": None,
                "subscription_status": "canceled",
                "subscription_expires_at": None,
            }).eq("id", profile.data["id"]).execute()

            return {"action": "subscription_cancelled", "user_id": profile.data["id"]}

    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        customer_id = invoice["customer"]

        # Marcar como past_due mas não revogar acesso imediatamente
        profile = (
            supabase.table("profiles")
            .select("id")
            .eq("stripe_customer_id", customer_id)
            .single()
            .execute()
        )
        if profile.data:
            supabase.table("profiles").update({
                "subscription_status": "past_due",
            }).eq("id", profile.data["id"]).execute()

        return {"action": "payment_failed", "customer_id": customer_id}

    return {"action": "unhandled", "type": event["type"]}
