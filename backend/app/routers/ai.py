"""
Router dos agentes de IA.
Endpoints para análise financeira e automação WhatsApp.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal, Optional
from app.middleware.auth import get_current_user
from app.services.ai_finance_agent import finance_agent
from app.services.ai_whatsapp_agent import whatsapp_agent
from app.database import get_supabase_admin
from app.config.plans import normalize_plan, has_feature

router = APIRouter(prefix="/ai", tags=["Inteligência Artificial"])


# --- Schemas locais ---

class AnalysisRequest(BaseModel):
    type: Literal["finance", "clients", "full"] = "full"


class ChatRequest(BaseModel):
    message: str


class WhatsAppWebhookPayload(BaseModel):
    """Payload recebido do webhook da Evolution API."""
    sender: str
    message: str
    instance: Optional[str] = None


# --- Agente Financeiro (requer plano Pro+) ---

@router.post("/finance/analyze")
async def financial_analysis(
    data: AnalysisRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Gera análise financeira com IA.
    Requer plano Pro ou superior.
    """
    # Verificar plano
    supabase = get_supabase_admin()
    profile = (
        supabase.table("profiles")
        .select("plan")
        .eq("id", current_user["id"])
        .single()
        .execute()
    )

    plan = normalize_plan(profile.data.get("plan", "free")) if profile.data else "free"
    if plan == "free":
        raise HTTPException(
            status_code=403,
            detail="Este recurso requer o plano Pro ou superior.",
        )

    try:
        result = await finance_agent.analyze(
            user_id=current_user["id"],
            analysis_type=data.type,
        )

        # Salvar no histórico
        supabase.table("ai_conversations").insert({
            "user_id": current_user["id"],
            "agent_type": "finance",
            "message": f"Análise tipo: {data.type}",
            "response": result,
        }).execute()

        return {"analysis": result, "type": data.type}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise: {str(e)}")


@router.post("/finance/chat")
async def financial_chat(
    data: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Chat interativo com o agente financeiro.
    Requer plano Pro ou superior.
    """
    supabase = get_supabase_admin()
    profile = (
        supabase.table("profiles")
        .select("plan")
        .eq("id", current_user["id"])
        .single()
        .execute()
    )

    plan = normalize_plan(profile.data.get("plan", "free")) if profile.data else "free"
    if plan == "free":
        raise HTTPException(
            status_code=403,
            detail="Este recurso requer o plano Pro ou superior.",
        )

    try:
        result = await finance_agent.chat(
            user_id=current_user["id"],
            message=data.message,
        )

        # Salvar no histórico
        supabase.table("ai_conversations").insert({
            "user_id": current_user["id"],
            "agent_type": "finance",
            "message": data.message,
            "response": result,
        }).execute()

        return {"response": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no chat: {str(e)}")


@router.get("/finance/history")
async def get_finance_history(
    current_user: dict = Depends(get_current_user),
):
    """Retorna histórico de conversas com o agente financeiro."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("ai_conversations")
        .select("*")
        .eq("user_id", current_user["id"])
        .eq("agent_type", "finance")
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )

    return {"history": result.data or []}


# --- Agente WhatsApp (requer feature no plano atual) ---

@router.post("/whatsapp/webhook")
async def whatsapp_webhook(payload: WhatsAppWebhookPayload):
    """
    Recebe mensagens do WhatsApp via Evolution API webhook.
    Processa com IA e responde automaticamente.
    """
    try:
        # Identificar qual usuário (dono do negócio) recebeu a mensagem
        # baseado na instância do Evolution API
        supabase = get_supabase_admin()

        # Buscar o user_id associado a esta instância
        # (configurado quando o usuário conecta o WhatsApp)
        # Por simplificação, buscar pelo telefone do remetente nos clientes
        client_result = (
            supabase.table("clients")
            .select("user_id")
            .ilike("phone", f"%{payload.sender[-8:]}%")
            .limit(1)
            .execute()
        )

        if not client_result.data:
            return {"status": "ignored", "reason": "Remetente não encontrado"}

        user_id = client_result.data[0]["user_id"]

        # Verificar se o dono tem plano Enterprise
        profile = (
            supabase.table("profiles")
            .select("plan")
            .eq("id", user_id)
            .single()
            .execute()
        )

        plan = normalize_plan(profile.data.get("plan")) if profile.data else "free"
        if not has_feature(plan, "whatsapp_agent"):
            return {"status": "ignored", "reason": "Plano não suporta WhatsApp"}

        # Processar mensagem com IA
        response = await whatsapp_agent.process_incoming_message(
            user_id=user_id,
            sender_phone=payload.sender,
            message=payload.message,
        )

        # Enviar resposta pelo WhatsApp
        await whatsapp_agent.send_whatsapp_message(payload.sender, response)

        return {"status": "ok", "response_sent": True}

    except Exception as e:
        return {"status": "error", "detail": str(e)}


@router.post("/whatsapp/send-reminders")
async def send_reminders(
    current_user: dict = Depends(get_current_user),
):
    """
    Envia lembretes de agendamento para clientes via WhatsApp.
    Requer plano com acesso ao agente WhatsApp.
    """
    supabase = get_supabase_admin()
    profile = (
        supabase.table("profiles")
        .select("plan")
        .eq("id", current_user["id"])
        .single()
        .execute()
    )

    plan = normalize_plan(profile.data.get("plan")) if profile.data else "free"
    if not has_feature(plan, "whatsapp_agent"):
        raise HTTPException(
            status_code=403,
            detail="Este recurso requer o plano Pro.",
        )

    try:
        count = await whatsapp_agent.send_appointment_reminder(
            user_id=current_user["id"],
        )
        return {"message": f"Lembretes enviados para {count} agendamentos."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao enviar lembretes: {str(e)}")


@router.get("/whatsapp/messages")
async def get_whatsapp_messages(
    current_user: dict = Depends(get_current_user),
):
    """Retorna histórico de mensagens WhatsApp."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("whatsapp_messages")
        .select("*, clients(name)")
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    messages = []
    for item in (result.data or []):
        client_data = item.pop("clients", None)
        item["client_name"] = client_data["name"] if client_data else "Desconhecido"
        messages.append(item)

    return {"messages": messages}
