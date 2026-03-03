"""
Schemas Pydantic para clientes/contatos do usuário.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ClientBase(BaseModel):
    """Campos base de um cliente."""
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    """Dados para criação de cliente."""
    pass


class ClientUpdate(BaseModel):
    """Campos atualizáveis de um cliente."""
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    archived: Optional[bool] = None


class ClientResponse(ClientBase):
    """Resposta com dados completos do cliente."""
    id: str
    user_id: str
    archived: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
