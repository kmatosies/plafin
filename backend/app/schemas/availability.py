from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Optional, List
from datetime import time
import uuid

class AvailabilityBase(BaseModel):
    weekday: int = Field(..., ge=0, le=6, description="Dia da semana (0=Segunda, 6=Domingo)")
    start_time: time = Field(..., description="Horário de início (ex: 08:00:00)")
    end_time: time = Field(..., description="Horário de término (ex: 18:00:00)")
    slot_duration: int = Field(30, gt=0, description="Duração do slot em minutos (ex: 30)")

    @model_validator(mode="after")
    def validate_window(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time deve ser maior que start_time")
        return self

class AvailabilityCreate(AvailabilityBase):
    pass

class AvailabilityUpdate(BaseModel):
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    slot_duration: Optional[int] = Field(default=None, gt=0)

    @model_validator(mode="after")
    def reject_null_required_fields(self):
        for name in ("start_time", "end_time", "slot_duration"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} não pode ser nulo")
        return self

class AvailabilityResponse(AvailabilityBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID

class SlotResponse(BaseModel):
    slots: List[str] = Field(description="Lista de horários de início disponíveis no formato YYYY-MM-DD HH:MM:SS")
    date: str = Field(description="Data consultada YYYY-MM-DD")
