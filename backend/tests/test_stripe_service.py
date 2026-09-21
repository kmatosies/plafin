import json
import time
from types import SimpleNamespace

import pytest
import stripe

from app.services import stripe_service


def _settings() -> SimpleNamespace:
    return SimpleNamespace(
        stripe_secret_key="stripe-secret-placeholder",
        stripe_webhook_secret="webhook-secret-placeholder",
        stripe_price_pro_monthly_brl="price_brl_test",
        frontend_url_normalized="https://app.example.test",
    )


def test_price_mapping_accepts_only_configured_brl_price(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(stripe_service, "get_settings", _settings)

    assert stripe_service._price_to_plan("price_brl_test") == "pro"
    with pytest.raises(ValueError, match="unknown Price ID"):
        stripe_service._price_to_plan("price_usd_test")


def test_signed_webhook_is_accepted_and_invalid_signature_is_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = _settings()
    monkeypatch.setattr(stripe_service, "get_settings", lambda: settings)
    payload = json.dumps(
        {
            "id": "evt_test_signed",
            "object": "event",
            "type": "invoice.paid",
            "data": {"object": {}},
        }
    ).encode()
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload.decode()}"
    signature = stripe.WebhookSignature._compute_signature(
        signed_payload,
        settings.stripe_webhook_secret,
    )
    header = f"t={timestamp},v1={signature}"

    event = stripe_service.construct_webhook_event(payload, header)
    assert event["id"] == "evt_test_signed"

    with pytest.raises(ValueError, match="Assinatura"):
        stripe_service.construct_webhook_event(payload, f"t={timestamp},v1=invalid")


def test_duplicate_webhook_does_not_run_handler(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    event = {
        "id": "evt_test_duplicate",
        "type": "invoice.payment_failed",
        "data": {"object": {}},
    }
    monkeypatch.setattr(
        stripe_service,
        "construct_webhook_event",
        lambda payload, signature: event,
    )
    monkeypatch.setattr(stripe_service, "_mark_event_processing", lambda *_: False)

    def fail_if_called(*args: object, **kwargs: object) -> None:
        pytest.fail("duplicate event must not reach a business handler")

    monkeypatch.setattr(
        stripe_service,
        "_handle_invoice_payment_failed",
        fail_if_called,
    )

    result = stripe_service.handle_webhook_event(b"{}", "signature")
    assert result["action"] == "duplicate_ignored"


class _ProfileQuery:
    def select(self, *args: object) -> "_ProfileQuery":
        return self

    def eq(self, *args: object) -> "_ProfileQuery":
        return self

    def single(self) -> "_ProfileQuery":
        return self

    def execute(self) -> SimpleNamespace:
        return SimpleNamespace(data={"stripe_customer_id": "cus_test_existing"})


class _Supabase:
    def table(self, name: str) -> _ProfileQuery:
        assert name == "profiles"
        return _ProfileQuery()


def test_checkout_uses_server_configured_brl_price(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict = {}

    class _CheckoutSessions:
        @staticmethod
        def create(params: dict) -> SimpleNamespace:
            captured.update(params)
            return SimpleNamespace(id="cs_test_cycle02", url="https://checkout.test")

    client = SimpleNamespace(
        v1=SimpleNamespace(
            customers=SimpleNamespace(),
            checkout=SimpleNamespace(sessions=_CheckoutSessions()),
        )
    )
    monkeypatch.setattr(stripe_service, "get_settings", _settings)
    monkeypatch.setattr(stripe_service, "get_supabase_admin", _Supabase)
    monkeypatch.setattr(stripe_service, "_get_stripe_client", lambda: client)

    url = stripe_service.create_checkout_session(
        user_id="user-test",
        user_email="user@example.test",
        plan="pro",
    )

    assert url == "https://checkout.test"
    assert captured["line_items"] == [{"price": "price_brl_test", "quantity": 1}]
    assert "payment_method_types" not in captured
    assert captured["mode"] == "subscription"
