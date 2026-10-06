"""Fail closed before local integration tests can mutate a Supabase target."""

from urllib.parse import urlsplit


def assert_disposable_local_target(
    supabase_url: str,
    *,
    run_enabled: bool,
    disposable_confirmed: bool,
    worker_enabled: bool,
) -> None:
    if not run_enabled or not disposable_confirmed:
        raise RuntimeError("Teste integrado requer confirmação de stack local descartável.")
    if worker_enabled:
        raise RuntimeError("Worker deve permanecer desativado nos testes integrados.")

    try:
        target = urlsplit(supabase_url)
        valid = (
            target.scheme == "http"
            and target.hostname == "127.0.0.1"
            and target.port == 55321
            and target.path in ("", "/")
            and not target.username
            and not target.password
            and not target.query
            and not target.fragment
        )
    except ValueError:
        valid = False
    if not valid:
        raise RuntimeError("Destino Supabase não é o endpoint local permitido para teste.")
