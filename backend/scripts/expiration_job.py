"""
Job de expiração de assinaturas.
Execute este script diariamente via cron ou scheduler:

  # No servidor Linux, adicionar ao crontab:
  0 8 * * * cd /app && python -m scripts.expiration_job

  # Ou usar APScheduler dentro do FastAPI (lifespan).
"""

import sys
import os
from datetime import datetime

# Ajustar path para funcionar como script standalone
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import get_supabase_admin
from app.services.notification_service import notification_service


def run_expiration_job() -> dict:
    """
    1. Chama a função SQL que enfileira notificações de 5 dias.
    2. Chama a função SQL que faz downgrade de assinaturas expiradas.
    3. Processa as notificações pendentes na outbox (envia emails).
    """

    supabase = get_supabase_admin()
    start_time = datetime.utcnow()
    results = {}

    # 1. Enfileirar notificações de expiração em 5 dias
    print("[Job] Verificando assinaturas que expiram em 5 dias...")
    notif_result = supabase.rpc("queue_expiration_notifications").execute()
    results["notifications_queued"] = notif_result.data or 0
    print(f"[Job] {results['notifications_queued']} notificação(ões) enfileirada(s).")

    # 2. Fazer downgrade de assinaturas expiradas
    print("[Job] Verificando assinaturas expiradas para downgrade...")
    downgrade_result = supabase.rpc("auto_downgrade_expired_subscriptions").execute()
    results["downgrades_applied"] = downgrade_result.data or 0
    print(f"[Job] {results['downgrades_applied']} usuário(s) movido(s) para FREE.")

    # 3. Processar e enviar notificações pendentes
    print("[Job] Processando fila de notificações...")
    send_results = notification_service.process_pending_notifications(batch_size=100)
    results.update(send_results)
    print(
        f"[Job] Emails: {results.get('sent', 0)} enviados, "
        f"{results.get('failed', 0)} com falha."
    )

    elapsed = (datetime.utcnow() - start_time).total_seconds()
    results["elapsed_seconds"] = round(elapsed, 2)
    print(f"[Job] Concluído em {results['elapsed_seconds']}s. Resultado: {results}")
    return results


if __name__ == "__main__":
    run_expiration_job()
