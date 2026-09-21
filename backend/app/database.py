"""
Conexão com o Supabase.
Fornece clients para uso geral (anon key) e admin (service role key).
Implementa padrão Singleton para evitar memory leak em produção.
"""

from supabase import create_client, Client
from app.config import get_settings

# The admin client is stateless for table operations and can be reused.
# Auth flows use a fresh anon client to avoid sharing session state across users.
_anon_client: Client | None = None
_admin_client: Client | None = None


def create_supabase_anon_client() -> Client:
    """Create an isolated anon client for a single authentication flow."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def get_supabase_client() -> Client:
    """Shared anon client for stateless token validation."""
    global _anon_client
    if _anon_client is None:
        _anon_client = create_supabase_anon_client()
    return _anon_client


def get_supabase_admin() -> Client:
    """Client com service role — ignora RLS, usar apenas no backend."""
    global _admin_client
    if _admin_client is None:
        settings = get_settings()
        _admin_client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _admin_client
