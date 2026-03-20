"""
Router de autenticação.
Registro, login e reset de senha via Supabase Auth.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.schemas.user import (
    UserRegister,
    UserLogin,
    PasswordReset,
    AuthResponse,
    ProfileResponse,
)
from app.database import get_supabase_client, get_supabase_admin
from app.config import get_settings
from app.limiter import limiter

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
@limiter.limit("5/minute")
async def login(request: Request, data: UserLogin):
    """Autentica o usuário e retorna token JWT (Max: 5 tentativas por min)."""
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

        # Buscar perfil usando o access_token do usuário (sem precisar do admin/service_role key)
        # O RLS do Supabase permite que o usuário leia o próprio perfil com seu token
        settings = get_settings()
        from supabase import create_client as _create_client
        user_client = _create_client(settings.supabase_url, settings.supabase_key)
        user_client.postgrest.auth(auth_response.session.access_token)

        profile = (
            user_client.table("profiles")
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
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
):
    """
    Logout no servidor: invalida o token JWT no Supabase.
    O frontend também deve remover o token do armazenamento local.
    """
    try:
        from app.database import get_supabase_client
        supabase = get_supabase_client()
        supabase.auth.sign_out()
        return {"message": "Logout realizado com sucesso."}
    except Exception:
        # Mesmo em caso de erro, considerar logout bem-sucedido
        return {"message": "Logout realizado com sucesso."}


@router.post("/update-password")
async def update_password(data: dict):
    """
    Redefine a senha do usuário usando o access_token de recuperação
    enviado pelo Supabase via email (link de reset).
    """
    try:
        access_token = data.get("access_token")
        new_password = data.get("new_password")

        if not access_token or not new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="access_token e new_password são obrigatórios.",
            )
        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A senha deve ter no mínimo 8 caracteres.",
            )

        supabase = get_supabase_client()

        # Usa o token de recuperação para criar uma sessão temporária
        session_res = supabase.auth.set_session(access_token=access_token, refresh_token="")

        if not session_res or not session_res.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido ou expirado. Solicite um novo link.",
            )

        # Atualiza a senha com a sessão ativa
        supabase.auth.update_user({"password": new_password})

        return {"message": "Senha redefinida com sucesso."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao redefinir senha: {str(e)}",
        )
