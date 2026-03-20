"""
Configuração central de Planos, Limites e Features.
Esta é a ÚNICA fonte de verdade para o que cada plano pode fazer.

Planos públicos: FREE | PRO
(STARTER mantido internamente apenas para compatibilidade de dados legados)
"""

from typing import Optional

# ---------------------------------------------------------------------------
# Constantes de planos
# ---------------------------------------------------------------------------
PLAN_FREE = "free"
PLAN_STARTER = "starter"   # Mantido internamente para compatibilidade, não exposto ao usuário
PLAN_PRO = "pro"

# Planos exibidos ao usuário na UI
PUBLIC_PLANS = [PLAN_FREE, PLAN_PRO]

PLAN_HIERARCHY: dict[str, int] = {
    PLAN_FREE: 0,
    PLAN_STARTER: 1,   # Herança de compatibilidade
    PLAN_PRO: 2,
}

# ---------------------------------------------------------------------------
# Limites quantitativos por plano
# None = ilimitado
# ---------------------------------------------------------------------------
PLAN_LIMITS: dict[str, dict[str, Optional[int]]] = {
    PLAN_FREE: {
        "max_clients": 20,                    # Atualizado: 20 clientes
        "max_transactions_per_month": 20,
    },
    PLAN_STARTER: {
        "max_clients": 250,
        "max_transactions_per_month": 500,
    },
    PLAN_PRO: {
        "max_clients": None,                  # Ilimitado
        "max_transactions_per_month": None,   # Ilimitado
    },
}

# ---------------------------------------------------------------------------
# Preços por moeda (para exibição no frontend)
# ---------------------------------------------------------------------------
PLAN_PRICES: dict[str, dict[str, str]] = {
    PLAN_FREE: {
        "BRL": "R$ 0",
        "USD": "US$ 0",
    },
    PLAN_PRO: {
        "BRL": "R$ 79,90",
        "USD": "US$ 19,90",
    },
}

# ---------------------------------------------------------------------------
# Features binárias (habilitado/desabilitado) por plano
# ---------------------------------------------------------------------------
PLAN_FEATURES: dict[str, set[str]] = {
    PLAN_FREE: {
        "agenda",
        "dashboard_basic",
        "report_preview",        # Pode visualizar, mas não baixar PDF
    },
    PLAN_STARTER: {
        "agenda",
        "dashboard_basic",
        "dashboard_advanced",
        "report_preview",
        "report_pdf_monthly",    # Pode gerar PDF mensal
        "history_monthly",
        "ai_finance_advisor",
    },
    PLAN_PRO: {
        "agenda",
        "dashboard_basic",
        "dashboard_advanced",
        "dashboard_bi",
        "report_preview",
        "report_pdf_monthly",
        "report_pdf_annual",
        "history_monthly",
        "history_annual",
        "ai_finance_advisor",
        "ai_finance_advanced",
        "whatsapp_agent",
        "whatsapp_agent_logs",
    },
}


# ---------------------------------------------------------------------------
# Funções auxiliares
# ---------------------------------------------------------------------------

def get_limit(plan: str, metric: str) -> Optional[int]:
    """Retorna o limite numérico de uma métrica para um plano.
    Retorna None se ilimitado. Retorna 0 se o plano não existir.
    """
    plan_cfg = PLAN_LIMITS.get(plan, PLAN_LIMITS[PLAN_FREE])
    return plan_cfg.get(metric, 0)


def has_feature(plan: str, feature: str) -> bool:
    """Verifica se um plano possui uma feature específica."""
    return feature in PLAN_FEATURES.get(plan, set())


def is_plan_at_least(user_plan: str, required_plan: str) -> bool:
    """Verifica se o plano do usuário é igual ou superior ao requerido."""
    user_level = PLAN_HIERARCHY.get(user_plan, 0)
    required_level = PLAN_HIERARCHY.get(required_plan, 0)
    return user_level >= required_level


def get_upgrade_message(user_plan: str, feature: str) -> str:
    """Retorna mensagem amigável de paywall para o frontend exibir."""
    feature_map = {
        "max_clients": "adicionar mais clientes",
        "max_transactions_per_month": "registrar mais transações este mês",
        "report_pdf_monthly": "gerar relatório em PDF",
        "report_pdf_annual": "gerar relatório anual em PDF",
        "ai_finance_advisor": "usar o Consultor Financeiro com IA",
        "ai_finance_advanced": "usar a IA Financeira Avançada",
        "whatsapp_agent": "usar o Agente WhatsApp",
        "dashboard_bi": "acessar o BI Avançado",
        "dashboard_advanced": "acessar o Dashboard Avançado",
        "history_monthly": "acessar o Histórico Mensal",
    }
    feature_label = feature_map.get(feature, f"usar '{feature}'")
    return (
        f"Seu plano atual ({user_plan.upper()}) não permite {feature_label}. "
        f"Faça upgrade para o Plano Pro e desbloqueie este recurso."
    )


def normalize_plan(plan: str | None) -> str:
    """Normaliza planos legados para os planos públicos atuais."""
    if plan in (None, "", PLAN_FREE):
        return PLAN_FREE
    if plan in (PLAN_STARTER, PLAN_PRO):
        return plan
    if plan == "enterprise":
        return PLAN_PRO
    return PLAN_FREE
