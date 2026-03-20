"""
Middleware de autenticação.
Valida o JWT do Supabase em cada request protegido.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_supabase_client

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Extrai e valida o JWT do header Authorization.
    Retorna os dados do usuário autenticado.
    """
    token = credentials.credentials

    try:
        supabase = get_supabase_client()
        # Valida o token com o Supabase e retorna dados do usuário
        user_response = supabase.auth.get_user(token)

        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido ou expirado.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = user_response.user
        # ✅ Token NÃO incluído no dict para evitar vazamento em logs
        return {
            "id": user.id,
            "email": user.email,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Falha na autenticação: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_plan(required_plan: str):
    """
    Factory para criar dependência que verifica o plano do usuário.
    Uso: Depends(require_plan("pro")) ou Depends(require_plan("starter"))

    ATENÇÃO: Para verificar features e limites específicos, prefira usar
    require_feature() e require_limit() de app.middleware.access_control,
    pois eles são mais granulares.
    """
    from app.database import get_supabase_admin
    from app.config.plans import PLAN_HIERARCHY, normalize_plan

    async def check_plan(
        current_user: dict = Depends(get_current_user),
    ) -> dict:
        supabase = get_supabase_admin()
        result = (
            supabase.table("profiles")
            .select("plan, subscription_status")
            .eq("id", current_user["id"])
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Perfil não encontrado.",
            )

        plan = normalize_plan(result.data.get("plan", "free"))
        sub_status = result.data.get("subscription_status", "active")

        # Assinatura cancelada = FREE efetivo
        if sub_status == "canceled" and plan != "free":
            plan = "free"

        user_level = PLAN_HIERARCHY.get(plan, 0)
        required_level = PLAN_HIERARCHY.get(required_plan, 0)

        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Este recurso requer o plano '{required_plan.upper()}' ou superior. "
                    f"Seu plano atual é '{plan.upper()}'."
                ),
            )

        current_user["plan"] = plan
        current_user["subscription_status"] = sub_status
        return current_user

    return check_plan
