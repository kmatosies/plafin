"""
Serviço de controle de uso e limites dos planos.
Centraliza a lógica de incremento de contadores e verificação de limites.
"""

from datetime import datetime
from typing import Optional
from app.database import get_supabase_admin
from app.config.plans import get_limit, PLAN_FREE


class UsageService:
    """
    Gerencia os contadores de uso (usage_counters) de forma atômica.
    Usa RPC do Supabase para garantir atomicidade via SQL UPSERT.
    """

    @staticmethod
    def _get_month_period(dt: Optional[datetime] = None) -> str:
        """Retorna a chave de período no formato YYYY-MM."""
        target = dt or datetime.utcnow()
        return target.strftime("%Y-%m")

    @staticmethod
    def get_counter(user_id: str, metric: str, period: str = "all") -> int:
        """Lê o valor atual de um contador."""
        supabase = get_supabase_admin()
        result = (
            supabase.table("usage_counters")
            .select("current_value")
            .eq("user_id", user_id)
            .eq("metric", metric)
            .eq("period", period)
            .maybe_single()
            .execute()
        )
        if result.data:
            return result.data.get("current_value", 0)
        return 0

    @staticmethod
    def increment_counter(
        user_id: str,
        metric: str,
        period: str = "all",
        delta: int = 1,
    ) -> int:
        """
        Incrementa atomicamente um contador via RPC (função SQL).
        Retorna o novo valor do contador.
        """
        supabase = get_supabase_admin()
        result = supabase.rpc(
            "increment_usage_counter",
            {
                "p_user_id": user_id,
                "p_metric": metric,
                "p_period": period,
                "p_delta": delta,
            },
        ).execute()
        return result.data or 0

    @staticmethod
    def decrement_counter(
        user_id: str,
        metric: str,
        period: str = "all",
        delta: int = 1,
    ) -> int:
        """
        Decrementa atomicamente um contador (ex: ao deletar um registro).
        Garante que não fique negativo.
        """
        supabase = get_supabase_admin()
        result = supabase.rpc(
            "increment_usage_counter",
            {
                "p_user_id": user_id,
                "p_metric": metric,
                "p_period": period,
                "p_delta": -delta,
            },
        ).execute()
        # Garantir que não fique negativo: se ficou negativo, corrigir para 0
        new_value = result.data or 0
        if new_value < 0:
            supabase.table("usage_counters").update({"current_value": 0}).eq(
                "user_id", user_id
            ).eq("metric", metric).eq("period", period).execute()
            return 0
        return new_value

    @staticmethod
    def is_within_limit(user_id: str, plan: str, metric: str, period: str = "all") -> bool:
        """
        Verifica se o uso atual está ABAIXO do limite do plano.
        Retorna True se ainda há capacidade (pode criar mais).
        Retorna True se o plano tiver limite None (ilimitado).
        """
        limit = get_limit(plan, metric)
        if limit is None:
            return True  # Ilimitado

        current = UsageService.get_counter(user_id, metric, period)
        return current < limit

    @staticmethod
    def sync_clients_count(user_id: str) -> int:
        """
        Sincroniza o contador de clientes totais fazendo um COUNT real.
        Use para corrigir divergências. Não use em requests normais.
        """
        supabase = get_supabase_admin()
        result = (
            supabase.table("clients")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("archived", False)
            .execute()
        )
        real_count = result.count or 0

        # Atualizar o contador com o valor real
        supabase.table("usage_counters").upsert(
            {
                "user_id": user_id,
                "metric": "clients_total",
                "period": "all",
                "current_value": real_count,
                "updated_at": datetime.utcnow().isoformat(),
            },
            on_conflict="user_id,metric,period",
        ).execute()

        return real_count

    @staticmethod
    def sync_transactions_month(user_id: str, year: int, month: int) -> int:
        """
        Sincroniza o contador de transações do mês fazendo um COUNT real.
        Use para corrigir divergências.
        """
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
        real_count = result.count or 0

        period = f"{year:04d}-{month:02d}"
        supabase.table("usage_counters").upsert(
            {
                "user_id": user_id,
                "metric": "transactions_month",
                "period": period,
                "current_value": real_count,
                "updated_at": datetime.utcnow().isoformat(),
            },
            on_conflict="user_id,metric,period",
        ).execute()

        return real_count


usage_service = UsageService()
