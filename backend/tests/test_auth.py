from types import SimpleNamespace

import pytest

from app.routers import auth
from app.schemas.user import PasswordUpdate


@pytest.mark.asyncio
async def test_password_recovery_uses_both_session_tokens(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: dict[str, object] = {}

    class _Auth:
        def set_session(self, *, access_token: str, refresh_token: str):
            calls["access_token"] = access_token
            calls["refresh_token"] = refresh_token
            return SimpleNamespace(user=SimpleNamespace(id="user-test"))

        def update_user(self, payload: dict) -> None:
            calls["password"] = payload["password"]

    monkeypatch.setattr(
        auth,
        "create_supabase_anon_client",
        lambda: SimpleNamespace(auth=_Auth()),
    )

    response = await auth.update_password(
        PasswordUpdate(
            access_token="access-test",
            refresh_token="refresh-test",
            new_password="new-password-test",
        )
    )

    assert response["message"] == "Senha redefinida com sucesso."
    assert calls == {
        "access_token": "access-test",
        "refresh_token": "refresh-test",
        "password": "new-password-test",
    }
