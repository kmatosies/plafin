"""
Configuração centralizada do aplicativo.
Carrega variáveis de ambiente do .env
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Configurações do aplicativo carregadas do .env"""

    # App
    app_name: str = "FinanceAgenda"
    frontend_url: str = "http://localhost:3000"
    frontend_origins: str = ""
    backend_url: str = "http://localhost:8000"

    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_key: str = ""

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    
    # Stripe — Plano STARTER
    stripe_price_starter_monthly: str = ""

    # Stripe — Plano PRO
    stripe_price_pro_monthly: str = ""

    # Gemini
    gemini_api_key: str = ""

    # Email (SMTP) para notificações
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_from: str = "no-reply@serviceos.app"

    # Worker de notificações
    notification_worker_enabled: bool = True
    notification_worker_interval_seconds: int = 60
    notification_worker_error_backoff_seconds: int = 300

    # WhatsApp (Evolution API) — PRO
    evolution_api_url: str = "http://localhost:8080"
    evolution_api_key: str = ""
    evolution_instance: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Retorna instância cacheada das configurações."""
    return Settings()
