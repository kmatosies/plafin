from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import time
import uuid

class AvailabilityBase(BaseModel):
    weekday: int = Field(..., ge=0, le=6, description="Dia da semana (0=Segunda, 6=Domingo)")
    start_time: time = Field(..., description="Horário de início (ex: 08:00:00)")
    end_time: time = Field(..., description="Horário de término (ex: 18:00:00)")
    slot_duration: int = Field(30, gt=0, description="Duração do slot em minutos (ex: 30)")

class AvailabilityCreate(AvailabilityBase):
    pass

class AvailabilityUpdate(BaseModel):
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    slot_duration: Optional[int] = None

class AvailabilityResponse(AvailabilityBase):
    id: uuid.UUID
    tenant_id: uuid.UUID

    class Config:
        orm_mode = True

class SlotResponse(BaseModel):
    slots: List[str] = Field(description="Lista de horários de início disponíveis no formato YYYY-MM-DD HH:MM:SS")
    date: str = Field(description="Data consultada YYYY-MM-DD")
