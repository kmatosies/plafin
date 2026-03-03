"""
Router de autenticação.
Registro, login e reset de senha via Supabase Auth.
"""

from fastapi import APIRouter, HTTPException, status
from app.schemas.user import (
    UserRegister,
    UserLogin,
    PasswordReset,
    AuthResponse,
    ProfileResponse,
)
from app.database import get_supabase_client, get_supabase_admin
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister):
    """Registra um novo usuário e cria seu perfil."""
    try:
        supabase = get_supabase_client()
        settings = get_settings()

        # 1. Criar usuário no Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não foi possível criar o usuário. Verifique os dados.",
            )

        user_id = auth_response.user.id

        # 2. Criar perfil na tabela profiles (usando admin para ignorar RLS)
        admin = get_supabase_admin()
        profile_data = {
            "id": user_id,
            "full_name": data.full_name,
            "email": data.email,
            "phone": data.phone or "",
            "business_name": data.business_name or "",
            "plan": "free",
        }
        admin.table("profiles").insert(profile_data).execute()

        # 3. Retornar token + dados
        return AuthResponse(
            access_token=auth_response.session.access_token if auth_response.session else "",
            user=ProfileResponse(
                id=user_id,
                email=data.email,
                full_name=data.full_name,
                phone=data.phone,
                business_name=data.business_name,
                plan="free",
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao registrar: {str(e)}",
        )


@router.post("/login", response_model=AuthResponse)
async def login(data: UserLogin):
    """Autentica o usuário e retorna token JWT."""
    try:
        supabase = get_supabase_client()

        auth_response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password,
        })

        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou senha inválidos.",
            )

        # Buscar perfil completo
        admin = get_supabase_admin()
        profile = (
            admin.table("profiles")
            .select("*")
            .eq("id", auth_response.user.id)
            .single()
            .execute()
        )

        if not profile.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Perfil não encontrado.",
            )

        return AuthResponse(
            access_token=auth_response.session.access_token,
            user=ProfileResponse(**profile.data),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Falha no login: {str(e)}",
        )


@router.post("/reset-password")
async def reset_password(data: PasswordReset):
    """Envia email de reset de senha."""
    try:
        settings = get_settings()
        supabase = get_supabase_client()

        supabase.auth.reset_password_email(
            data.email,
            options={"redirect_to": f"{settings.frontend_url}/reset-password"},
        )

        return {"message": "Se o email existir, um link de recuperação foi enviado."}

    except Exception as e:
        # Não revelar se o email existe ou não — segurança
        return {"message": "Se o email existir, um link de recuperação foi enviado."}


@router.post("/logout")
async def logout():
    """
    Logout no lado do servidor.
    Na prática, o frontend remove o token localmente.
    """
    return {"message": "Logout realizado com sucesso."}
