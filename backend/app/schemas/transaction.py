"""
Schemas Pydantic para transações financeiras.
"""

from pydantic import BaseModel
from typing import Optional, Literal
from datetime import date, datetime


class TransactionBase(BaseModel):
    """Campos base de uma transação."""
    description: str
    amount: float
    date: date
    type: Literal["receita", "despesa"]
    category: Optional[str] = None
    status: Literal["pago", "pendente", "atrasado"] = "pendente"
    payment_method: Optional[str] = None
    recurring: bool = False
    client_id: Optional[str] = None


class TransactionCreate(TransactionBase):
    """Dados para criação de transação."""
    pass


class TransactionUpdate(BaseModel):
    """Campos atualizáveis de uma transação."""
    description: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[date] = None
    type: Optional[Literal["receita", "despesa"]] = None
    category: Optional[str] = None
    status: Optional[Literal["pago", "pendente", "atrasado"]] = None
    payment_method: Optional[str] = None
    recurring: Optional[bool] = None
    client_id: Optional[str] = None


class TransactionResponse(TransactionBase):
    """Resposta com dados completos da transação."""
    id: str
    user_id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FinancialSummary(BaseModel):
    """Resumo financeiro do mês."""
    total_revenue: float = 0.0
    total_expenses: float = 0.0
    net_profit: float = 0.0
    pending_receivables: float = 0.0
    pending_payables: float = 0.0
    transaction_count: int = 0
