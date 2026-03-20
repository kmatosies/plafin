"""
Agente de IA Financeiro.
Usa Google Gemini para analisar dados financeiros e gerar insights.
"""

from google import genai
from google.genai import types
from collections import Counter
from app.config import get_settings
from app.database import get_supabase_admin
from datetime import date
from dateutil.relativedelta import relativedelta


class FinanceAIAgent:
    """Agente de IA para anÃ¡lise e consultoria financeira."""

    def __init__(self):
        settings = get_settings()
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = "gemini-2.0-flash"

    async def _get_user_financial_data(self, user_id: str) -> dict:
        """Busca dados financeiros do usuÃ¡rio para contextualizar a IA."""
        supabase = get_supabase_admin()

        # NOTA DE OTIMIZAÃ‡ÃƒO: O ideal Ã© criar uma funÃ§Ã£o no PostgreSQL (RPC)
        # que calcula todos os agregados de uma vez para minimizar as chamadas de rede.
        # Ex: `SELECT * FROM get_financial_summary(user_id, period_start_date);`
        # A implementaÃ§Ã£o abaixo mantÃ©m a lÃ³gica em Python, mas com a data corrigida.

        # TransaÃ§Ãµes dos Ãºltimos 3 meses
        # Usar relativedelta Ã© mais preciso que subtrair um nÃºmero fixo de dias.
        three_months_ago = (date.today() - relativedelta(months=3)).isoformat()

        transactions = (
            supabase.table("transactions")
            .select("type, status, amount, category")
            .eq("user_id", user_id)
            .gte("date", three_months_ago)
            .execute()
        )

        # Clientes ativos
        clients = (
            supabase.table("clients")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("archived", False)
            .execute()
        )

        # Agendamentos do mÃªs
        month_start = date.today().replace(day=1).isoformat()
        appointments = (
            supabase.table("appointments")
            .select("status")
            .eq("user_id", user_id)
            .gte("date", month_start)
            .execute()
        )

        tx_data = transactions.data or []
        appointments_data = appointments.data or []

        # Processar dados em uma única passagem para maior eficiência
        revenue = 0
        expenses = 0
        pending = 0
        expense_categories: Counter[str] = Counter()
        for transaction in tx_data:
            amount = transaction.get("amount", 0) or 0
            tx_type = transaction.get("type")
            tx_status = transaction.get("status")

            if tx_type == "receita":
                revenue += amount
            elif tx_type == "despesa":
                expenses += amount
                category = transaction.get("category") or "Outros"
                expense_categories[category] += amount

            if tx_status == "pendente":
                pending += amount

        status_counts: Counter[str] = Counter()
        for appointment in appointments_data:
            status = appointment.get("status")
            if status:
                status_counts[status] += 1

        return {
            "resumo_financeiro": {
                "receitas_total": revenue,
                "despesas_total": expenses,
                "lucro_liquido": revenue - expenses,
                "pendencias": pending,
                "total_transacoes": len(tx_data),
            },
            "categorias_despesas": dict(expense_categories),
            "clientes_ativos": clients.count or 0,
            "agendamentos_mes": len(appointments_data),
            "status_agendamentos": {
                "confirmados": status_counts.get("confirmado", 0),
                "pendentes": status_counts.get("pendente", 0),
                "cancelados": status_counts.get("cancelado", 0),
            },
            "periodo": f"Ãšltimos 3 meses (desde {three_months_ago})",
        }

    async def analyze(self, user_id: str, analysis_type: str) -> str:
        """
        Gera anÃ¡lise financeira baseada nos dados do usuÃ¡rio.
        
        Tipos: 'finance', 'clients', 'full', 'custom'
        """
        data = await self._get_user_financial_data(user_id)

        prompts = {
            "finance": (
                f"Analise os dados financeiros a seguir e forneÃ§a:\n"
                f"1. DiagnÃ³stico da saÃºde financeira\n"
                f"2. 3 dicas prÃ¡ticas para reduzir despesas\n"
                f"3. 3 estratÃ©gias para aumentar faturamento\n"
                f"4. Alerta sobre pendÃªncias\n\n"
                f"Dados: {data['resumo_financeiro']}\n"
                f"Categorias de despesas: {data['categorias_despesas']}"
            ),
            "clients": (
                f"Analise os dados de clientes e agendamentos:\n"
                f"- Clientes ativos: {data['clientes_ativos']}\n"
                f"- Agendamentos: {data['status_agendamentos']}\n\n"
                f"ForneÃ§a insights sobre taxa de cancelamento, fidelizaÃ§Ã£o "
                f"e como melhorar o engajamento."
            ),
            "full": (
                f"FaÃ§a um diagnÃ³stico completo 360Â° do negÃ³cio:\n"
                f"{data}\n\n"
                f"Seja crÃ­tico, profissional e direto. Cubra finanÃ§as, clientes, "
                f"agenda e dÃª recomendaÃ§Ãµes acionÃ¡veis."
            ),
        }

        prompt = prompts.get(analysis_type, prompts["full"])

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "VocÃª Ã© um consultor financeiro sÃªnior especializado em "
                    "micro e pequenas empresas, com 20 anos de experiÃªncia. "
                    "Suas respostas devem ser profissionais, motivadoras e "
                    "extremamente estratÃ©gicas. Use Markdown para formatar. "
                    "Use emojis para facilitar a leitura. Responda em portuguÃªs do Brasil."
                ),
                temperature=0.7,
            ),
        )

        return response.text or "NÃ£o foi possÃ­vel gerar a anÃ¡lise no momento."

    async def chat(self, user_id: str, message: str) -> str:
        """
        Chat interativo â€” o usuÃ¡rio faz perguntas sobre suas finanÃ§as.
        """
        data = await self._get_user_financial_data(user_id)

        prompt = (
            f"O usuÃ¡rio pergunta: '{message}'\n\n"
            f"Contexto financeiro do negÃ³cio dele:\n{data}\n\n"
            f"Responda de forma Ãºtil e personalizada baseado nos dados reais."
        )

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "VocÃª Ã© um assistente financeiro virtual inteligente. "
                    "Responda perguntas sobre finanÃ§as baseado no contexto dos dados "
                    "do usuÃ¡rio. Seja conciso mas completo. Use Markdown para formatar. "
                    "Responda em portuguÃªs do Brasil."
                ),
                temperature=0.6,
            ),
        )

        return response.text or "Desculpe, nÃ£o consegui processar sua pergunta."


# InstÃ¢ncia singleton
finance_agent = FinanceAIAgent()


