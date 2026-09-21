import pytest

from app.config import Settings


def test_settings_accept_canonical_production_names(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "anon-placeholder")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-placeholder")
    monkeypatch.setenv("STRIPE_SECRET_KEY", "stripe-secret-placeholder")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "webhook-secret-placeholder")
    monkeypatch.setenv("STRIPE_PRICE_PRO_MONTHLY_BRL", "price_brl_placeholder")
    monkeypatch.setenv("STRIPE_PRICE_PRO_MONTHLY_USD", "price_usd_placeholder")
    monkeypatch.setenv("RESEND_API_KEY", "resend-placeholder")
    monkeypatch.setenv("ENABLE_NOTIFICATION_WORKER", "false")
    monkeypatch.setenv("FRONTEND_URL", "https://app.example")
    monkeypatch.setenv("BACKEND_URL", "https://api.example")

    settings = Settings(_env_file=None)

    assert settings.supabase_url == "https://example.supabase.co"
    assert settings.supabase_anon_key == "anon-placeholder"
    assert settings.supabase_service_role_key == "service-placeholder"
    assert settings.stripe_secret_key == "stripe-secret-placeholder"
    assert settings.stripe_webhook_secret == "webhook-secret-placeholder"
    assert settings.stripe_price_pro_monthly_brl == "price_brl_placeholder"
    assert settings.enable_notification_worker is False
    assert settings.frontend_url_normalized == "https://app.example"
    assert settings.backend_url_normalized == "https://api.example"


def test_settings_accept_deprecated_aliases() -> None:
    settings = Settings(
        _env_file=None,
        SUPABASE_KEY="legacy-anon-placeholder",
        SUPABASE_SERVICE_KEY="legacy-service-placeholder",
        STRIPE_PRICE_PRO_MONTHLY="legacy-price-placeholder",
    )

    assert settings.supabase_anon_key == "legacy-anon-placeholder"
    assert settings.supabase_service_role_key == "legacy-service-placeholder"
    assert settings.stripe_price_pro_monthly_brl == "legacy-price-placeholder"


def test_optional_integrations_do_not_block_boot() -> None:
    settings = Settings(
        _env_file=None,
        RENDER_INSTANCE_ID="operator-managed-placeholder",
    )

    assert settings.enable_notification_worker is False
    assert not hasattr(settings, "resend_api_key")
    assert not hasattr(settings, "stripe_price_pro_monthly_usd")


def test_legacy_worker_flag_is_accepted() -> None:
    settings = Settings(_env_file=None, NOTIFICATION_WORKER_ENABLED="false")

    assert settings.enable_notification_worker is False


def test_public_urls_are_normalized(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FRONTEND_URL", "plafin.example/")
    monkeypatch.setenv("BACKEND_URL", "https://api.plafin.example/path")
    monkeypatch.setenv(
        "FRONTEND_ORIGINS",
        "https://www.plafin.example/, plafin.example",
    )

    settings = Settings(_env_file=None)

    assert settings.frontend_url_normalized == "https://plafin.example"
    assert settings.backend_url_normalized == "https://api.plafin.example"
    assert settings.frontend_origins_normalized == [
        "https://www.plafin.example",
        "https://plafin.example",
    ]
