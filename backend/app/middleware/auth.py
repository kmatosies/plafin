"""Supabase bearer-token authentication dependencies."""

import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.database import get_supabase_client


logger = logging.getLogger("plafin.auth")
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais ausentes.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        response = get_supabase_client().auth.get_user(credentials.credentials)
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalido ou expirado.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {"id": response.user.id, "email": response.user.email}
    except HTTPException:
        raise
    except Exception:
        logger.warning("Supabase rejected an authentication token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_plan(required_plan: str):
    """Require the authenticated user to have at least the requested plan."""
    from app.config.plans import PLAN_HIERARCHY, normalize_plan
    from app.database import get_supabase_admin

    async def check_plan(
        current_user: dict = Depends(get_current_user),
    ) -> dict:
        result = (
            get_supabase_admin()
            .table("profiles")
            .select("plan, subscription_status")
            .eq("id", current_user["id"])
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Perfil nao encontrado.",
            )

        profile = result.data[0]
        plan = normalize_plan(profile.get("plan", "free"))
        subscription_status = profile.get("subscription_status", "active")
        if subscription_status == "canceled" and plan != "free":
            plan = "free"

        if PLAN_HIERARCHY.get(plan, 0) < PLAN_HIERARCHY.get(required_plan, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Este recurso requer o plano {required_plan.upper()}.",
            )

        current_user["plan"] = plan
        current_user["subscription_status"] = subscription_status
        return current_user

    return check_plan
