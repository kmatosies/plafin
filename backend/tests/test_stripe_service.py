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


class _BillingProfileQuery:
    def __init__(self, store: "_BillingStore") -> None:
        self.store = store
        self.filters: dict[str, object] = {}
        self.changes: dict | None = None
        self.selected_columns: set[str] | None = None

    def select(self, columns: str) -> "_BillingProfileQuery":
        self.selected_columns = {column.strip() for column in columns.split(",")}
        return self

    def eq(self, key: str, value: object) -> "_BillingProfileQuery":
        self.filters[key] = value
        return self

    def is_(self, key: str, value: str) -> "_BillingProfileQuery":
        assert value == "null"
        self.filters[key] = None
        return self

    def maybe_single(self) -> "_BillingProfileQuery":
        return self

    def update(self, changes: dict) -> "_BillingProfileQuery":
        self.changes = changes
        return self

    def execute(self) -> SimpleNamespace:
        if self.changes is not None and self.store.before_update:
            self.store.before_update()
            self.store.before_update = None
        matched = all(self.store.profile.get(key) == value for key, value in self.filters.items())
        if self.changes is not None:
            if matched:
                self.store.profile.update(self.changes)
                return SimpleNamespace(data=[{"id": self.store.profile["id"]}])
            return SimpleNamespace(data=[])
        if not matched:
            return SimpleNamespace(data=None)
        selected = self.selected_columns or set(self.store.profile)
        return SimpleNamespace(
            data={key: value for key, value in self.store.profile.items() if key in selected}
        )


class _BillingStore:
    def __init__(self) -> None:
        self.profile = {
            "id": "user-test",
            "plan": "pro",
            "stripe_customer_id": "cus_test",
            "stripe_subscription_id": "sub_current",
            "stripe_price_id": "price_brl_test",
            "subscription_status": "active",
        }
        self.before_update = None

    def table(self, name: str) -> _BillingProfileQuery:
        assert name == "profiles"
        return _BillingProfileQuery(self)


def _billing_store(monkeypatch: pytest.MonkeyPatch) -> _BillingStore:
    store = _BillingStore()
    monkeypatch.setattr(stripe_service, "get_supabase_admin", lambda: store)
    monkeypatch.setattr(stripe_service, "get_settings", _settings)
    monkeypatch.setattr(stripe_service, "invalidate_user_plan_cache", lambda *_: None)
    return store


def _subscription_event(subscription_id: str) -> dict:
    return {
        "type": "customer.subscription.deleted",
        "data": {
            "object": {
                "id": subscription_id,
                "customer": "cus_test",
                "metadata": {"user_id": "user-test"},
            }
        },
    }


def test_old_subscription_delete_cannot_clear_new_subscription(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _billing_store(monkeypatch)

    result = stripe_service._handle_subscription_deleted(_subscription_event("sub_old"))

    assert result["action"] == "subscription_deleted_ignored"
    assert store.profile["stripe_subscription_id"] == "sub_current"
    assert store.profile["plan"] == "pro"


def test_current_subscription_delete_clears_only_matching_binding(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _billing_store(monkeypatch)

    result = stripe_service._handle_subscription_deleted(_subscription_event("sub_current"))

    assert result["action"] == "subscription_deleted"
    assert store.profile["stripe_subscription_id"] is None
    assert store.profile["plan"] == "free"


def test_deleted_subscription_update_replay_cannot_restore_pro(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _billing_store(monkeypatch)
    stripe_service._handle_subscription_deleted(_subscription_event("sub_current"))
    client = SimpleNamespace(
        v1=SimpleNamespace(
            subscriptions=SimpleNamespace(
                retrieve=lambda *_: {
                    "id": "sub_current",
                    "customer": "cus_test",
                    "status": "canceled",
                    "items": {"data": [{"price": {"id": "price_brl_test"}}]},
                }
            )
        )
    )
    monkeypatch.setattr(stripe_service, "_get_stripe_client", lambda: client)
    stale_update = {
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": "sub_current",
                "customer": "cus_test",
                "status": "active",
                "metadata": {"user_id": "user-test"},
                "items": {"data": [{"price": {"id": "price_brl_test"}}]},
            }
        },
    }

    stripe_service._handle_subscription_upsert(stale_update)

    assert store.profile["plan"] == "free"
    assert store.profile["stripe_subscription_id"] is None
    assert store.profile["subscription_status"] == "canceled"


def test_canceled_profile_rejects_unverified_other_active_subscription(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _billing_store(monkeypatch)
    stripe_service._handle_subscription_deleted(_subscription_event("sub_current"))
    client = SimpleNamespace(
        v1=SimpleNamespace(
            subscriptions=SimpleNamespace(
                retrieve=lambda *_: {
                    "id": "sub_other",
                    "customer": "cus_test",
                    "status": "active",
                    "items": {"data": [{"price": {"id": "price_brl_test"}}]},
                }
            )
        )
    )
    monkeypatch.setattr(stripe_service, "_get_stripe_client", lambda: client)
    stale_update = {
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": "sub_other",
                "customer": "cus_test",
                "status": "active",
                "metadata": {"user_id": "user-test"},
            }
        },
    }

    with pytest.raises(ValueError, match="verified new checkout or reconciliation"):
        stripe_service._handle_subscription_upsert(stale_update)

    assert store.profile["plan"] == "free"
    assert store.profile["stripe_subscription_id"] is None


def test_new_verified_checkout_can_bind_after_cancel_without_old_replay_winning(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _billing_store(monkeypatch)
    stripe_service._handle_subscription_deleted(_subscription_event("sub_current"))
    subscriptions = {
        "sub_current": {"id": "sub_current", "customer": "cus_test", "status": "canceled"},
        "sub_new": {
            "id": "sub_new",
            "customer": "cus_test",
            "status": "active",
            "items": {"data": [{"price": {"id": "price_brl_test"}}]},
        },
    }
    client = SimpleNamespace(
        v1=SimpleNamespace(
            subscriptions=SimpleNamespace(retrieve=lambda subscription_id: subscriptions[subscription_id])
        )
    )
    monkeypatch.setattr(stripe_service, "_get_stripe_client", lambda: client)
    checkout = {
        "data": {
            "object": {
                "customer": "cus_test",
                "subscription": "sub_new",
                "metadata": {"user_id": "user-test"},
            }
        }
    }
    stripe_service._handle_checkout_session_completed(checkout)

    assert store.profile["stripe_subscription_id"] == "sub_new"
    assert store.profile["plan"] == "pro"
    assert stripe_service._handle_subscription_deleted(_subscription_event("sub_current"))[
        "action"
    ] == "subscription_deleted_ignored"
    assert store.profile["stripe_subscription_id"] == "sub_new"


def test_subscription_changed_during_delete_requires_reconciliation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _billing_store(monkeypatch)
    store.before_update = lambda: store.profile.update(stripe_subscription_id="sub_new")

    with pytest.raises(ValueError, match="reconciliation required"):
        stripe_service._handle_subscription_deleted(_subscription_event("sub_current"))

    assert store.profile["stripe_subscription_id"] == "sub_new"
    assert store.profile["plan"] == "pro"


def test_old_failed_invoice_does_not_change_current_subscription(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _billing_store(monkeypatch)
    event = {"data": {"object": {"customer": "cus_test", "subscription": "sub_old"}}}

    result = stripe_service._handle_invoice_payment_failed(event)

    assert result["action"] == "invoice_payment_failed_ignored"
    assert store.profile["subscription_status"] == "active"


def test_failed_invoice_for_current_subscription_preserves_its_binding(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _billing_store(monkeypatch)
    event = {"data": {"object": {"customer": "cus_test", "subscription": "sub_current"}}}

    result = stripe_service._handle_invoice_payment_failed(event)

    assert result["action"] == "invoice_payment_failed"
    assert store.profile["subscription_status"] == "past_due"
    assert store.profile["stripe_subscription_id"] == "sub_current"


def test_invoice_without_subscription_cannot_change_profile(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _billing_store(monkeypatch)
    event = {"data": {"object": {"customer": "cus_test"}}}

    with pytest.raises(ValueError, match="subscription verificável"):
        stripe_service._handle_invoice_payment_failed(event)

    assert store.profile["subscription_status"] == "active"


def test_invoice_cannot_promote_profile_when_subscription_customer_differs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _billing_store(monkeypatch)
    client = SimpleNamespace(
        v1=SimpleNamespace(
            subscriptions=SimpleNamespace(
                retrieve=lambda *_: {
                    "id": "sub_current",
                    "customer": "cus_other",
                    "status": "active",
                    "items": {"data": [{"price": {"id": "price_brl_test"}}]},
                }
            )
        )
    )
    monkeypatch.setattr(stripe_service, "_get_stripe_client", lambda: client)
    event = {"data": {"object": {"customer": "cus_test", "subscription": "sub_current"}}}

    with pytest.raises(ValueError, match="do not match"):
        stripe_service._handle_invoice_payment_succeeded(event)

    assert store.profile["stripe_subscription_id"] == "sub_current"
    assert store.profile["plan"] == "pro"


def test_checkout_cannot_bind_another_customers_subscription(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _billing_store(monkeypatch)
    store.profile["stripe_subscription_id"] = None
    client = SimpleNamespace(
        v1=SimpleNamespace(
            subscriptions=SimpleNamespace(
                retrieve=lambda *_: {"id": "sub_other", "customer": "cus_other"}
            )
        )
    )
    monkeypatch.setattr(stripe_service, "_get_stripe_client", lambda: client)
    event = {
        "data": {
            "object": {
                "customer": "cus_test",
                "subscription": "sub_other",
                "metadata": {"user_id": "user-test"},
            }
        }
    }

    with pytest.raises(ValueError, match="do not match"):
        stripe_service._handle_checkout_session_completed(event)

    assert store.profile["stripe_subscription_id"] is None


def test_old_subscription_snapshot_requires_reconciliation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _billing_store(monkeypatch)
    client = SimpleNamespace(
        v1=SimpleNamespace(
            subscriptions=SimpleNamespace(
                retrieve=lambda *_: {
                    "id": "sub_old",
                    "customer": "cus_test",
                    "status": "active",
                    "items": {"data": [{"price": {"id": "price_brl_test"}}]},
                }
            )
        )
    )
    monkeypatch.setattr(stripe_service, "_get_stripe_client", lambda: client)
    event = {
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": "sub_old",
                "customer": "cus_test",
                "status": "active",
                "metadata": {"user_id": "user-test"},
                "items": {"data": [{"price": {"id": "price_brl_test"}}]},
            }
        },
    }

    with pytest.raises(ValueError, match="differs from the current profile"):
        stripe_service._handle_subscription_upsert(event)

    assert store.profile["stripe_subscription_id"] == "sub_current"
    assert store.profile["plan"] == "pro"


def test_unknown_customer_metadata_cannot_bind_existing_user(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _billing_store(monkeypatch)

    with pytest.raises(ValueError, match="not bound to the customer"):
        stripe_service._resolve_user_id_from_sources(
            customer_id="cus_other", fallback_user_id="user-test"
        )

    assert store.profile["stripe_customer_id"] == "cus_test"
