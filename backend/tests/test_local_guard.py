"""The target guard must reject unsafe destinations before any network call."""

import pytest

from tests.local_guard import assert_disposable_local_target


@pytest.mark.parametrize(
    "url",
    [
        "https://example.supabase.co",
        "http://127.0.0.1:54321",
        "http://localhost:54321",
        "http://127.0.0.1:54322",
        "http://127.0.0.1:55321@another.example",
        "http://127.0.0.1:55321/rest/v1",
        "http://127.0.0.1:55321?key=x",
        "",
    ],
)
def test_guard_rejects_non_exact_target(url: str) -> None:
    with pytest.raises(RuntimeError, match="Destino Supabase"):
        assert_disposable_local_target(
            url,
            run_enabled=True,
            disposable_confirmed=True,
            worker_enabled=False,
        )


def test_guard_rejects_missing_disposable_confirmation() -> None:
    with pytest.raises(RuntimeError, match="descartável"):
        assert_disposable_local_target(
            "http://127.0.0.1:55321",
            run_enabled=True,
            disposable_confirmed=False,
            worker_enabled=False,
        )


def test_guard_rejects_worker() -> None:
    with pytest.raises(RuntimeError, match="Worker"):
        assert_disposable_local_target(
            "http://127.0.0.1:55321",
            run_enabled=True,
            disposable_confirmed=True,
            worker_enabled=True,
        )


def test_guard_accepts_exact_local_target() -> None:
    assert_disposable_local_target(
        "http://127.0.0.1:55321",
        run_enabled=True,
        disposable_confirmed=True,
        worker_enabled=False,
    )
