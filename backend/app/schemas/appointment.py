"""
Schemas Pydantic para agendamentos.
Aceitam o contrato usado pelo frontend e persistem no modelo principal do backend.
"""

from pydantic import BaseModel, ConfigDict
from typing import Optional, Literal
from datetime import datetime, date, time


class AppointmentCreate(BaseModel):
    """Dados para criação de agendamento."""
    client_id: str
    date: date
    start_time: time
    end_time: time
    status: Literal["confirmado", "pendente", "cancelado", "concluido"] = "pendente"
    notes: Optional[str] = None
    title: Optional[str] = None
    value: Optional[float] = None


class AppointmentUpdate(BaseModel):
    """Campos atualizáveis de um agendamento."""
    client_id: Optional[str] = None
    date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    status: Optional[Literal["confirmado", "pendente", "cancelado", "concluido"]] = None
    notes: Optional[str] = None
    title: Optional[str] = None
    value: Optional[float] = None


class AppointmentResponse(BaseModel):
    """Resposta com dados completos do agendamento."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    date: str
    start_time: str
    end_time: str
    status: Literal["confirmado", "pendente", "cancelado", "concluido"]
    notes: Optional[str] = None
    title: str
    duration_minutes: int = 60
    value: Optional[float] = None
    created_at: Optional[datetime] = None
