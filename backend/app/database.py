"""
Conexão com o Supabase.
Fornece clients para uso geral (anon key) e admin (service role key).
"""

from supabase import create_client, Client
from app.config import get_settings


def get_supabase_client() -> Client:
    """Client com chave anon — respeita RLS policies."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_key)


def get_supabase_admin() -> Client:
    """Client com service role — ignora RLS, usar apenas no backend."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)
