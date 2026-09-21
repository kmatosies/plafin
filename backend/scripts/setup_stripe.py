"""Validate the configured Stripe Price without mutating Stripe.

This replaces the legacy provisioning script, which created obsolete plans and
prices. Product and Price creation must now be reviewed and performed in the
Stripe Dashboard before the canonical Price ID is configured in the backend.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import stripe
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")


def main() -> int:
    secret_key = os.getenv("STRIPE_SECRET_KEY")
    price_id = os.getenv("STRIPE_PRICE_PRO_MONTHLY_BRL") or os.getenv(
        "STRIPE_PRICE_PRO_MONTHLY"
    )

    if not secret_key or not price_id:
        print(
            "Configure STRIPE_SECRET_KEY e STRIPE_PRICE_PRO_MONTHLY_BRL "
            "antes de executar."
        )
        return 1

    try:
        price = stripe.StripeClient(secret_key).v1.prices.retrieve(price_id)
    except stripe.StripeError as exc:
        print(f"Falha ao consultar o Price configurado: {exc.user_message or exc}")
        return 1

    recurring = price.recurring
    valid = (
        price.active
        and price.currency.lower() == "brl"
        and recurring is not None
        and recurring.interval == "month"
        and recurring.interval_count == 1
    )
    if not valid:
        print("O Price configurado não é um preço mensal BRL ativo.")
        return 1

    print(f"Price mensal BRL ativo validado: {price.id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
