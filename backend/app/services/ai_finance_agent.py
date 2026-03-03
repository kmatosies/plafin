"""
Agente de IA Financeiro.
Usa Google Gemini para analisar dados financeiros e gerar insights.
"""

from google import genai
from google.genai import types
from app.config import get_settings
from app.database import get_supabase_admin
from datetime import datetime, date


class FinanceAIAgent:
    """Agente de IA para análise e consultoria financeira."""

    def __init__(self):
        settings = get_settings()
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = "gemini-2.0-flash"

    async def _get_user_financial_data(self, user_id: str) -> dict:
        """Busca dados financeiros do usuário para contextualizar a IA."""
        supabase = get_supabase_admin()

        # Transações dos últimos 3 meses
        three_months_ago = date.today().replace(
            month=max(1, date.today().month - 3)
        ).isoformat()

        transactions = (
            supabase.table("transactions")
            .select("*")
            .eq("user_id", user_id)
            .gte("date", three_months_ago)
            .order("date", desc=True)
            .execute()
        )

        # Clientes ativos
        clients = (
            supabase.table("clients")
            .select("id, name", count="exact")
            .eq("user_id", user_id)
            .eq("archived", False)
            .execute()
        )

        # Agendamentos do mês
        month_start = date.today().replace(day=1).isoformat()
        appointments = (
            supabase.table("appointments")
            .select("*")
            .eq("user_id", user_id)
            .gte("date", month_start)
            .execute()
        )

        tx_data = transactions.data or []
        revenue = sum(t["amount"] for t in tx_data if t["type"] == "receita")
        expenses = sum(t["amount"] for t in tx_data if t["type"] == "despesa")
        pending = sum(t["amount"] for t in tx_data if t["status"] == "pendente")

        # Categorizar despesas
        categories = {}
        for t in tx_data:
            if t["type"] == "despesa":
                cat = t.get("category", "Outros") or "Outros"
                categories[cat] = categories.get(cat, 0) + t["amount"]

        return {
            "resumo_financeiro": {
                "receitas_total": revenue,
                "despesas_total": expenses,
                "lucro_liquido": revenue - expenses,
                "pendencias": pending,
                "total_transacoes": len(tx_data),
            },
            "categorias_despesas": categories,
            "clientes_ativos": clients.count or 0,
            "agendamentos_mes": len(appointments.data or []),
            "status_agendamentos": {
                "confirmados": len([a for a in (appointments.data or []) if a["status"] == "confirmado"]),
                "pendentes": len([a for a in (appointments.data or []) if a["status"] == "pendente"]),
                "cancelados": len([a for a in (appointments.data or []) if a["status"] == "cancelado"]),
            },
            "periodo": f"Últimos 3 meses (desde {three_months_ago})",
        }

    async def analyze(self, user_id: str, analysis_type: str) -> str:
        """
        Gera análise financeira baseada nos dados do usuário.
        
        Tipos: 'finance', 'clients', 'full', 'custom'
        """
        data = await self._get_user_financial_data(user_id)

        prompts = {
            "finance": (
                f"Analise os dados financeiros a seguir e forneça:\n"
                f"1. Diagnóstico da saúde financeira\n"
                f"2. 3 dicas práticas para reduzir despesas\n"
                f"3. 3 estratégias para aumentar faturamento\n"
                f"4. Alerta sobre pendências\n\n"
                f"Dados: {data['resumo_financeiro']}\n"
                f"Categorias de despesas: {data['categorias_despesas']}"
            ),
            "clients": (
                f"Analise os dados de clientes e agendamentos:\n"
                f"- Clientes ativos: {data['clientes_ativos']}\n"
                f"- Agendamentos: {data['status_agendamentos']}\n\n"
                f"Forneça insights sobre taxa de cancelamento, fidelização "
                f"e como melhorar o engajamento."
            ),
            "full": (
                f"Faça um diagnóstico completo 360° do negócio:\n"
                f"{data}\n\n"
                f"Seja crítico, profissional e direto. Cubra finanças, clientes, "
                f"agenda e dê recomendações acionáveis."
            ),
        }

        prompt = prompts.get(analysis_type, prompts["full"])

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "Você é um consultor financeiro sênior especializado em "
                    "micro e pequenas empresas, com 20 anos de experiência. "
                    "Suas respostas devem ser profissionais, motivadoras e "
                    "extremamente estratégicas. Use Markdown para formatar. "
                    "Use emojis para facilitar a leitura. Responda em português do Brasil."
                ),
                temperature=0.7,
            ),
        )

        return response.text or "Não foi possível gerar a análise no momento."

    async def chat(self, user_id: str, message: str) -> str:
        """
        Chat interativo — o usuário faz perguntas sobre suas finanças.
        """
        data = await self._get_user_financial_data(user_id)

        prompt = (
            f"O usuário pergunta: '{message}'\n\n"
            f"Contexto financeiro do negócio dele:\n{data}\n\n"
            f"Responda de forma útil e personalizada baseado nos dados reais."
        )

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "Você é um assistente financeiro virtual inteligente. "
                    "Responda perguntas sobre finanças baseado no contexto dos dados "
                    "do usuário. Seja conciso mas completo. Use Markdown para formatar. "
                    "Responda em português do Brasil."
                ),
                temperature=0.6,
            ),
        )

        return response.text or "Desculpe, não consegui processar sua pergunta."


# Instância singleton
finance_agent = FinanceAIAgent()
