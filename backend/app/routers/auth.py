"""
Router de autenticação.
Registro, login e reset de senha via Supabase Auth.
"""

import logging

import httpx
from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.schemas.user import (
    UserRegister,
    UserLogin,
    PasswordReset,
    PasswordUpdate,
    AuthResponse,
    ProfileResponse,
)
from app.database import create_supabase_anon_client, get_supabase_admin
from app.config import get_settings
from app.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Autenticação"])
logger = logging.getLogger("plafin.auth")


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister):
    """Registra um novo usuário e cria seu perfil."""
    try:
        supabase = create_supabase_anon_client()
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
    except Exception:
        logger.exception("Failed to register user")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível concluir o cadastro.",
        )


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
async def login(request: Request, data: UserLogin):
    """Autentica o usuário e retorna token JWT (Max: 5 tentativas por min)."""
    try:
        supabase = create_supabase_anon_client()

        auth_response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password,
        })

        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou senha inválidos.",
            )

        # Buscar perfil usando o access_token do usuário (sem precisar do admin/service_role key)
        # O RLS do Supabase permite que o usuário leia o próprio perfil com seu token
        supabase.postgrest.auth(auth_response.session.access_token)

        profile = (
            supabase.table("profiles")
            .select("*")
            .eq("id", auth_response.user.id)
            .execute()
        )

        if not profile.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Perfil não encontrado.",
            )

        return AuthResponse(
            access_token=auth_response.session.access_token,
            user=ProfileResponse(**profile.data[0]),
        )

    except HTTPException:
        raise
    except Exception:
        logger.info("Login rejected")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos.",
        )


@router.post("/reset-password")
async def reset_password(data: PasswordReset):
    """Envia email de reset de senha."""
    try:
        settings = get_settings()
        supabase = create_supabase_anon_client()

        supabase.auth.reset_password_email(
            data.email,
            options={"redirect_to": f"{settings.frontend_url}/reset-password"},
        )

        return {"message": "Se o email existir, um link de recuperação foi enviado."}

    except Exception:
        # Não revelar se o email existe ou não — segurança
        return {"message": "Se o email existir, um link de recuperação foi enviado."}


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
):
    """
    Logout no servidor: invalida o token JWT no Supabase.
    O frontend também deve remover o token do armazenamento local.
    """
    try:
        settings = get_settings()
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                f"{settings.supabase_url.rstrip('/')}/auth/v1/logout",
                headers={
                    "apikey": settings.supabase_anon_key,
                    "Authorization": f"Bearer {credentials.credentials}",
                },
            )
    except Exception:
        logger.info("Remote logout could not be confirmed")

    # Local state is cleared by the frontend even if Supabase is unavailable.
    return {"message": "Logout realizado com sucesso."}


@router.post("/update-password")
async def update_password(data: PasswordUpdate):
    """
    Redefine a senha do usuário usando o access_token de recuperação
    enviado pelo Supabase via email (link de reset).
    """
    try:
        supabase = create_supabase_anon_client()

        # Usa o token de recuperação para criar uma sessão temporária
        session_res = supabase.auth.set_session(
            access_token=data.access_token,
            refresh_token=data.refresh_token,
        )

        if not session_res or not session_res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido ou expirado. Solicite um novo link.",
            )

        # Atualiza a senha com a sessão ativa
        supabase.auth.update_user({"password": data.new_password})

        return {"message": "Senha redefinida com sucesso."}

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to update password from recovery session")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível redefinir a senha.",
        )
