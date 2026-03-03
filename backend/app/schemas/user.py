"""
Schemas Pydantic para o modelo User/Profile.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# --- Auth ---

class UserRegister(BaseModel):
    """Dados para registro de novo usuário."""
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None
    business_name: Optional[str] = None


class UserLogin(BaseModel):
    """Dados para login."""
    email: str
    password: str


class PasswordReset(BaseModel):
    """Dados para reset de senha."""
    email: str


# --- Profile ---

class ProfileBase(BaseModel):
    """Campos base do perfil."""
    full_name: str
    phone: Optional[str] = None
    business_name: Optional[str] = None


class ProfileUpdate(BaseModel):
    """Campos atualizáveis do perfil."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    business_name: Optional[str] = None


class ProfileResponse(ProfileBase):
    """Resposta com dados do perfil."""
    id: str
    email: str
    plan: str = "free"
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AuthResponse(BaseModel):
    """Resposta de autenticação."""
    access_token: str
    token_type: str = "bearer"
    user: ProfileResponse
