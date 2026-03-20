"""
Conexão com o Supabase.
Fornece clients para uso geral (anon key) e admin (service role key).
Implementa padrão Singleton para evitar memory leak em produção.
"""

from supabase import create_client, Client
from app.config import get_settings

# Singletons — criados uma única vez por ciclo de vida da aplicação
_anon_client: Client | None = None
_admin_client: Client | None = None


def get_supabase_client() -> Client:
    """Client com chave anon — respeita RLS policies."""
    global _anon_client
    if _anon_client is None:
        settings = get_settings()
        _anon_client = create_client(settings.supabase_url, settings.supabase_key)
    return _anon_client


def get_supabase_admin() -> Client:
    """Client com service role — ignora RLS, usar apenas no backend."""
    global _admin_client
    if _admin_client is None:
        settings = get_settings()
        _admin_client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _admin_client
