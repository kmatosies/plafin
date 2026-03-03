"""
Serviço de notificações.
Processa a fila de notificações_outbox e envia emails.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime

from app.database import get_supabase_admin
from app.config import get_settings


class NotificationService:
    """
    Processa notificações pendentes da tabela notifications_outbox.
    Atualmente suporta o canal 'email'.
    Canal 'whatsapp' será implementado na fase PRO.
    """

    def _build_expiration_email(
        self,
        name: str,
        plan: str,
        expires_at: str,
    ) -> tuple[str, str]:
        """Retorna (subject, html_body) para o email de expiração."""
        plan_label = plan.capitalize()
        subject = f"[Service OS] Seu plano {plan_label} expira em 5 dias"
        html = f"""
        <html><body style="font-family: sans-serif; color: #333;">
        <h2 style="color: #6366f1;">Aviso de Renovação — Service OS</h2>
        <p>Olá, <strong>{name}</strong>!</p>
        <p>Seu plano <strong>{plan_label}</strong> irá expirar em <strong>5 dias</strong>
        (em <em>{expires_at}</em>).</p>
        <p>Para continuar aproveitando todos os recursos, renove sua assinatura acessando
        o seu painel do Service OS.</p>
        <p>
            <a href="https://serviceos.app/dashboard/billing"
               style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;
                      text-decoration:none;font-weight:bold;">
               Renovar Agora
            </a>
        </p>
        <hr>
        <p style="font-size:12px;color:#888;">
            Se você não renovar, seu plano será convertido automaticamente para FREE
            e você manterá todos os seus dados.
        </p>
        </body></html>
        """
        return subject, html

    def _send_email(self, to_email: str, subject: str, html_body: str) -> None:
        """
        Envia email via SMTP.
        Configurar SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS no .env
        """
        settings = get_settings()

        # Se não configurado, loga e interrompe sem falhar o worker
        if not getattr(settings, "smtp_host", None):
            print(f"[NotificationService] SMTP não configurado. Email para {to_email} ignorado.")
            return

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = getattr(settings, "smtp_from", "no-reply@serviceos.app")
        msg["To"] = to_email

        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.smtp_host, getattr(settings, "smtp_port", 587)) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_pass)
            server.sendmail(msg["From"], to_email, msg.as_string())

    def process_pending_notifications(self, batch_size: int = 50) -> dict:
        """
        Processa as notificações pendentes da fila.
        Retorna um resumo de quantas foram enviadas/falharam.
        """
        supabase = get_supabase_admin()

        # Buscar pendentes cuja hora agendada já passou
        result = (
            supabase.table("notifications_outbox")
            .select("*")
            .eq("status", "pending")
            .lte("scheduled_for", datetime.utcnow().isoformat())
            .order("scheduled_for")
            .limit(batch_size)
            .execute()
        )

        notifications = result.data or []
        sent = 0
        failed = 0

        for notif in notifications:
            try:
                payload = notif.get("payload", {})
                channel = notif.get("channel", "email")

                if channel == "email":
                    notif_type = notif.get("type", "")
                    email_to = payload.get("email_to", "")
                    name = payload.get("name", "")

                    if notif_type == "EXPIRATION_5_DAYS":
                        plan = payload.get("plan", "")
                        expires_at = payload.get("expires_at", "")
                        subject, html = self._build_expiration_email(name, plan, expires_at)
                        self._send_email(email_to, subject, html)

                # Marcar como enviado
                supabase.table("notifications_outbox").update(
                    {"status": "sent", "sent_at": datetime.utcnow().isoformat()}
                ).eq("id", notif["id"]).execute()
                sent += 1

            except Exception as e:
                # Marcar como falhou para reprocessamento manual
                supabase.table("notifications_outbox").update(
                    {
                        "status": "failed",
                        "error_message": str(e)[:500],
                    }
                ).eq("id", notif["id"]).execute()
                failed += 1
                print(f"[NotificationService] Falha ao processar notif {notif['id']}: {e}")

        return {"sent": sent, "failed": failed, "total": len(notifications)}


notification_service = NotificationService()
