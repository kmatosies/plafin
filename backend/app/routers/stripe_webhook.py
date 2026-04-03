"""
Router dedicado ao webhook Stripe.
"""

import logging

from fastapi import APIRouter, HTTPException, Request

from app.services.stripe_service import handle_webhook_event

logger = logging.getLogger("plafin.stripe")

router = APIRouter(prefix="/stripe", tags=["Stripe"])


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Endpoint público para eventos do Stripe.
    URL final em produção:
    POST https://plafin.onrender.com/api/stripe/webhook
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        result = handle_webhook_event(payload, sig_header)
        return {"status": "ok", **result}
    except ValueError as exc:
        logger.warning("Webhook Stripe rejeitado: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        logger.exception("Erro interno ao processar webhook Stripe.")
        raise HTTPException(status_code=500, detail="Erro interno ao processar webhook Stripe.")
