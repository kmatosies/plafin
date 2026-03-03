"""
Agente de IA para automação de WhatsApp.
Usa Evolution API + Gemini para atendimento inteligente e agendamento automático.
"""

import httpx
from google import genai
from google.genai import types
from datetime import datetime, timedelta
from app.config import get_settings
from app.database import get_supabase_admin


class WhatsAppAIAgent:
    """Agente de IA para automação de atendimento via WhatsApp."""

    def __init__(self):
        settings = get_settings()
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = "gemini-2.0-flash"
        self.evolution_url = settings.evolution_api_url
        self.evolution_key = settings.evolution_api_key
        self.evolution_instance = settings.evolution_instance

    async def send_whatsapp_message(self, phone: str, message: str) -> dict:
        """Envia mensagem pelo WhatsApp via Evolution API."""
        url = f"{self.evolution_url}/message/sendText/{self.evolution_instance}"

        # Formatar número (remover caracteres especiais, garantir formato correto)
        clean_phone = "".join(filter(str.isdigit, phone))
        if not clean_phone.startswith("55"):
            clean_phone = f"55{clean_phone}"

        payload = {
            "number": clean_phone,
            "text": message,
        }

        headers = {
            "Content-Type": "application/json",
            "apikey": self.evolution_key,
        }

        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(url, json=payload, headers=headers)
            return response.json()

    async def process_incoming_message(
        self,
        user_id: str,
        sender_phone: str,
        message: str,
    ) -> str:
        """
        Processa mensagem recebida via WhatsApp.
        Usa IA para gerar resposta contextual.
        """
        supabase = get_supabase_admin()

        # 1. Buscar perfil do dono do negócio
        profile = (
            supabase.table("profiles")
            .select("full_name, business_name")
            .eq("id", user_id)
            .single()
            .execute()
        )
        business_info = profile.data if profile.data else {}

        # 2. Buscar cliente pelo telefone
        client_result = (
            supabase.table("clients")
            .select("*")
            .eq("user_id", user_id)
            .ilike("phone", f"%{sender_phone[-8:]}%")
            .execute()
        )
        client = client_result.data[0] if client_result.data else None

        # 3. Buscar horários disponíveis (próximos 7 dias)
        available_slots = await self._get_available_slots(user_id)

        # 4. Buscar histórico da conversa (últimas 10 mensagens)
        history = (
            supabase.table("whatsapp_messages")
            .select("direction, message")
            .eq("user_id", user_id)
            .ilike("client_id", client["id"] if client else "")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        conversation_history = "\n".join(
            [f"{'Cliente' if m['direction'] == 'incoming' else 'Assistente'}: {m['message']}"
             for m in reversed(history.data or [])]
        )

        # 5. Gerar resposta com IA
        prompt = (
            f"Mensagem recebida do cliente: '{message}'\n\n"
            f"Informações do negócio:\n"
            f"- Nome: {business_info.get('business_name', 'Não informado')}\n"
            f"- Proprietário: {business_info.get('full_name', 'Não informado')}\n\n"
            f"Cliente: {client['name'] if client else 'Desconhecido'}\n\n"
            f"Horários disponíveis para agendamento:\n{available_slots}\n\n"
            f"Histórico da conversa:\n{conversation_history}\n\n"
            f"Responda de forma profissional, simpática e objetiva."
        )

        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "Você é um assistente virtual de atendimento via WhatsApp. "
                    "Seu papel é:\n"
                    "1. Atender clientes de forma cordial e profissional\n"
                    "2. Agendar consultas/reuniões quando solicitado\n"
                    "3. Informar sobre horários disponíveis\n"
                    "4. Responder dúvidas gerais sobre o negócio\n"
                    "5. Confirmar agendamentos existentes\n\n"
                    "Regras:\n"
                    "- Nunca invente informações sobre preços ou serviços\n"
                    "- Se não souber algo, diga que vai verificar e retornar\n"
                    "- Seja breve (mensagens de WhatsApp devem ser curtas)\n"
                    "- Use emojis com moderação para ser amigável\n"
                    "- Responda em português do Brasil\n"
                    "- Se o cliente quer agendar, confirme data, horário e serviço\n"
                    "- Se detectar intenção de agendamento, retorne a resposta com "
                    "o prefixo [AGENDAR:YYYY-MM-DD HH:MM:serviço] no início"
                ),
                temperature=0.5,
            ),
        )

        ai_response = response.text or "Desculpe, estou com dificuldades no momento. Um atendente entrará em contato."

        # 6. Salvar mensagens no banco
        client_id = client["id"] if client else None

        # Salvar mensagem recebida
        supabase.table("whatsapp_messages").insert({
            "user_id": user_id,
            "client_id": client_id,
            "direction": "incoming",
            "message": message,
        }).execute()

        # Salvar resposta enviada
        supabase.table("whatsapp_messages").insert({
            "user_id": user_id,
            "client_id": client_id,
            "direction": "outgoing",
            "message": ai_response,
        }).execute()

        # 7. Verificar se a IA detectou intenção de agendamento
        if ai_response.startswith("[AGENDAR:"):
            await self._auto_schedule(user_id, client_id, ai_response)
            # Remover o prefixo antes de enviar
            ai_response = ai_response.split("]", 1)[-1].strip()

        return ai_response

    async def _get_available_slots(self, user_id: str) -> str:
        """Busca horários disponíveis nos próximos 7 dias."""
        supabase = get_supabase_admin()
        today = datetime.now()
        next_week = today + timedelta(days=7)

        existing = (
            supabase.table("appointments")
            .select("date, duration_minutes")
            .eq("user_id", user_id)
            .gte("date", today.isoformat())
            .lte("date", next_week.isoformat())
            .neq("status", "cancelado")
            .execute()
        )

        booked_times = set()
        for apt in (existing.data or []):
            dt = datetime.fromisoformat(apt["date"])
            booked_times.add(dt.strftime("%Y-%m-%d %H:%M"))

        # Gerar slots disponíveis (horário comercial 8h-18h, intervalos de 1h)
        available = []
        for day_offset in range(1, 8):
            check_date = today + timedelta(days=day_offset)
            if check_date.weekday() >= 5:  # Pular fim de semana
                continue
            for hour in range(8, 18):
                slot_str = check_date.strftime(f"%Y-%m-%d {hour:02d}:00")
                if slot_str not in booked_times:
                    available.append(slot_str)

        if not available:
            return "Sem horários disponíveis na próxima semana."

        return "\n".join(available[:10])  # Limitar a 10 opções

    async def _auto_schedule(self, user_id: str, client_id: str, ai_response: str):
        """Cria agendamento automaticamente baseado na detecção da IA."""
        try:
            # Extrair dados do prefixo [AGENDAR:YYYY-MM-DD HH:MM:serviço]
            prefix = ai_response.split("]")[0].replace("[AGENDAR:", "")
            parts = prefix.split(":")
            date_str = parts[0]
            time_str = parts[1]
            service = parts[2] if len(parts) > 2 else "Consulta"

            appointment_date = datetime.fromisoformat(f"{date_str}T{time_str}:00")

            supabase = get_supabase_admin()
            supabase.table("appointments").insert({
                "user_id": user_id,
                "client_id": client_id,
                "title": service,
                "date": appointment_date.isoformat(),
                "status": "pendente",
                "notes": "Agendado automaticamente via WhatsApp",
            }).execute()

        except Exception as e:
            print(f"Erro ao criar agendamento automático: {e}")

    async def send_appointment_reminder(self, user_id: str):
        """Envia lembretes de agendamentos para amanhã."""
        supabase = get_supabase_admin()
        tomorrow = datetime.now() + timedelta(days=1)
        tomorrow_start = tomorrow.replace(hour=0, minute=0, second=0).isoformat()
        tomorrow_end = tomorrow.replace(hour=23, minute=59, second=59).isoformat()

        appointments = (
            supabase.table("appointments")
            .select("*, clients(name, phone)")
            .eq("user_id", user_id)
            .gte("date", tomorrow_start)
            .lte("date", tomorrow_end)
            .eq("status", "confirmado")
            .execute()
        )

        for apt in (appointments.data or []):
            client_data = apt.get("clients")
            if client_data and client_data.get("phone"):
                apt_time = datetime.fromisoformat(apt["date"]).strftime("%H:%M")
                message = (
                    f"Olá {client_data['name']}! 😊\n\n"
                    f"Lembrete: você tem um agendamento amanhã às {apt_time}.\n"
                    f"Serviço: {apt['title']}\n\n"
                    f"Confirma sua presença? Responda SIM ou NÃO."
                )
                await self.send_whatsapp_message(client_data["phone"], message)

        return len(appointments.data or [])


# Instância singleton
whatsapp_agent = WhatsAppAIAgent()
