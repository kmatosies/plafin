"""
Schemas Pydantic para agendamentos.
"""

from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


class AppointmentBase(BaseModel):
    """Campos base de um agendamento."""
    title: str
    date: datetime
    duration_minutes: int = 60
    status: Literal["confirmado", "pendente", "cancelado", "concluido"] = "pendente"
    notes: Optional[str] = None
    client_id: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    """Dados para criação de agendamento."""
    pass


class AppointmentUpdate(BaseModel):
    """Campos atualizáveis de um agendamento."""
    title: Optional[str] = None
    date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[Literal["confirmado", "pendente", "cancelado", "concluido"]] = None
    notes: Optional[str] = None
    client_id: Optional[str] = None


class AppointmentResponse(AppointmentBase):
    """Resposta com dados completos do agendamento."""
    id: str
    user_id: str
    client_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
