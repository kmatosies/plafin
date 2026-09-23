"""
Schemas Pydantic para o modelo User/Profile.
"""

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
from datetime import datetime


# --- Auth ---

class UserRegister(BaseModel):
    """Dados para registro de novo usuário."""
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    phone: Optional[str] = None
    business_name: Optional[str] = None


class UserLogin(BaseModel):
    """Dados para login."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class PasswordReset(BaseModel):
    """Dados para reset de senha."""
    email: EmailStr


class PasswordUpdate(BaseModel):
    """Tokens da recuperação e nova senha."""
    access_token: str = Field(min_length=1)
    refresh_token: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


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
