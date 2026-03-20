"""
Schemas Pydantic para clientes/contatos do usuário.
Normaliza "name" no backend para "full_name" no frontend.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class ClientBase(BaseModel):
    """Campos base de um cliente."""
    model_config = ConfigDict(populate_by_name=True)

    full_name: str = Field(validation_alias="name", serialization_alias="full_name")
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = "ativo"


class ClientCreate(ClientBase):
    """Dados para criação de cliente."""
    pass


class ClientUpdate(BaseModel):
    """Campos atualizáveis de um cliente."""
    model_config = ConfigDict(populate_by_name=True)

    full_name: Optional[str] = Field(default=None, validation_alias="name", serialization_alias="full_name")
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    archived: Optional[bool] = None


class ClientResponse(ClientBase):
    """Resposta com dados completos do cliente."""
    id: str
    user_id: str
    archived: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
