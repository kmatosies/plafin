"""
Configuração centralizada do aplicativo.
Carrega variáveis de ambiente do .env
"""

from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """Configurações do aplicativo carregadas do .env"""

    # App
    app_name: str = "Plafin"
    frontend_url: str = "http://localhost:5173"
    frontend_origins: str = ""
    backend_url: str = "http://localhost:8000"
    business_timezone: str = "America/Sao_Paulo"

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_ANON_KEY", "SUPABASE_KEY"),
    )
    supabase_service_role_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            "SUPABASE_SERVICE_ROLE_KEY",
            "SUPABASE_SERVICE_KEY",
        ),
    )

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    
    # Stripe — Plano PRO, Brasil/BRL only
    stripe_price_pro_monthly_brl: str = Field(
        default="",
        validation_alias=AliasChoices(
            "STRIPE_PRICE_PRO_MONTHLY_BRL",
            "STRIPE_PRICE_PRO_MONTHLY",
        ),
    )
    # Optional phase 2 integrations
    gemini_api_key: str = ""

    # Email (SMTP) para notificações
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_from: str = "no-reply@plafin.online"

    # WhatsApp (Evolution API) — PRO
    evolution_api_url: str = ""
    evolution_api_key: str = ""
    evolution_instance: str = ""

    # Optional background work
    enable_notification_worker: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "ENABLE_NOTIFICATION_WORKER",
            "NOTIFICATION_WORKER_ENABLED",
        ),
    )
    notification_worker_interval_seconds: int = Field(default=60, ge=1)
    notification_worker_error_backoff_seconds: int = Field(default=300, ge=1)

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        # Render and shared local env files may include operator-managed keys.
        # Every key consumed by this application is still declared above.
        extra="ignore",
        populate_by_name=True,
        str_strip_whitespace=True,
    )

    @staticmethod
    def _normalize_public_url(raw_url: str, *, default_scheme: str = "https") -> str:
        raw_url = (raw_url or "").strip().rstrip("/")
        if not raw_url:
            return ""

        if "://" not in raw_url:
            raw_url = f"{default_scheme}://{raw_url}"

        parsed = urlparse(raw_url)
        if not parsed.scheme or not parsed.netloc:
            return ""

        return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")

    @property
    def frontend_url_normalized(self) -> str:
        return self._normalize_public_url(self.frontend_url)

    @property
    def backend_url_normalized(self) -> str:
        return self._normalize_public_url(self.backend_url)

    @property
    def frontend_origins_normalized(self) -> list[str]:
        origins: list[str] = []
        for origin in self.frontend_origins.split(","):
            normalized = self._normalize_public_url(origin)
            if normalized:
                origins.append(normalized)
        return origins


@lru_cache()
def get_settings() -> Settings:
    """Retorna instância cacheada das configurações."""
    return Settings()
