"""
Serviço auxiliar do Supabase.
Operações reutilizáveis de banco de dados.
"""

from app.database import get_supabase_admin
from typing import Optional


class SupabaseService:
    """Operações auxiliares e reutilizáveis do Supabase."""

    @staticmethod
    def get_profile(user_id: str) -> Optional[dict]:
        """Busca perfil completo do usuário."""
        supabase = get_supabase_admin()
        result = (
            supabase.table("profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return result.data

    @staticmethod
    def update_profile(user_id: str, data: dict) -> Optional[dict]:
        """Atualiza dados do perfil."""
        supabase = get_supabase_admin()
        result = (
            supabase.table("profiles")
            .update(data)
            .eq("id", user_id)
            .execute()
        )
        return result.data[0] if result.data else None

    @staticmethod
    def get_user_plan(user_id: str) -> str:
        """Retorna o plano atual do usuário."""
        supabase = get_supabase_admin()
        result = (
            supabase.table("profiles")
            .select("plan")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return result.data.get("plan", "free") if result.data else "free"

    @staticmethod
    def count_user_transactions_month(user_id: str, year: int, month: int) -> int:
        """Conta transações do usuário no mês (para limitar plano free)."""
        from datetime import date

        start_date = date(year, month, 1).isoformat()
        if month == 12:
            end_date = date(year + 1, 1, 1).isoformat()
        else:
            end_date = date(year, month + 1, 1).isoformat()

        supabase = get_supabase_admin()
        result = (
            supabase.table("transactions")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .gte("date", start_date)
            .lt("date", end_date)
            .execute()
        )
        return result.count or 0


supabase_service = SupabaseService()
