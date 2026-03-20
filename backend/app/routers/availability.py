from fastapi import APIRouter, Depends, HTTPException, Query, status
from datetime import datetime, timedelta
from app.middleware.auth import get_current_user
from app.schemas.availability import AvailabilityCreate, AvailabilityUpdate, AvailabilityResponse, SlotResponse
from app.database import get_supabase_admin

router = APIRouter(prefix="/agenda", tags=["Agenda"])


def _availability_query(supabase, user_id: str):
    return supabase.table('availability').select('*').eq('tenant_id', str(user_id))

@router.post("/availability", response_model=AvailabilityResponse, status_code=status.HTTP_201_CREATED)
async def create_availability(
    data: AvailabilityCreate,
    current_user: dict = Depends(get_current_user)
):
    """Cria uma regra de disponibilidade para um determinado dia da semana (0=Segunda ... 6=Domingo)."""
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    # Verifica se já existe para este dia
    existing = _availability_query(supabase, user_id).eq('weekday', data.weekday).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Regra de disponibilidade já existe para este dia da semana. Use PUT para atualizar.")

    # Inserir
    insert_data = {
        "tenant_id": str(user_id),
        "weekday": data.weekday,
        "start_time": data.start_time.strftime("%H:%M:%S"),
        "end_time": data.end_time.strftime("%H:%M:%S"),
        "slot_duration": data.slot_duration
    }

    res = supabase.table('availability').insert(insert_data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Erro ao salvar a disponibilidade.")

    return res.data[0]

@router.get("/availability", response_model=list[AvailabilityResponse])
async def list_availability(current_user: dict = Depends(get_current_user)):
    """Lista as regras de disponibilidade da semana."""
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    res = _availability_query(supabase, user_id).order('weekday').execute()
    return res.data or []

@router.put("/availability/{availability_id}", response_model=AvailabilityResponse)
async def update_availability(
    availability_id: str,
    data: AvailabilityUpdate,
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    # Verifica se pertence ao tenant
    check = _availability_query(supabase, user_id).eq('id', availability_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Regra não encontrada.")

    update_data = {}
    if data.start_time is not None:
        update_data['start_time'] = data.start_time.strftime("%H:%M:%S")
    if data.end_time is not None:
        update_data['end_time'] = data.end_time.strftime("%H:%M:%S")
    if data.slot_duration is not None:
        update_data['slot_duration'] = data.slot_duration

    res = supabase.table('availability').update(update_data).eq('id', availability_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Erro ao atualizar.")
    
    return res.data[0]

@router.delete("/availability/{availability_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_availability(
    availability_id: str,
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase_admin()
    user_id = current_user["id"]
    res = supabase.table('availability').delete().eq('id', availability_id).eq('tenant_id', str(user_id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Regra não encontrada.")
    return None

@router.get("/slots", response_model=SlotResponse)
async def get_available_slots(
    date: str = Query(..., description="Data no formato YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user)
):
    """
    Retorna os slots de horários disponíveis para uma data específica,
    considerando as regras de disponibilidade do dia da semana e os agendamentos já existentes.
    """
    # Converter a string de data para objeto datetime
    try:
        query_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Data inválida. Use o formato YYYY-MM-DD.")
    
    weekday = query_date.weekday() # 0 = Monday, 6 = Sunday
    
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    # 1. Buscar regra de disponibilidade do dia
    avail_res = _availability_query(supabase, user_id).eq('weekday', weekday).execute()
    if not avail_res.data:
        # Se não há regra configurada para o dia, entendemos que não tem atendimento.
        return {"slots": [], "date": date}
    
    rule = avail_res.data[0]
    # parse time (string HH:MM:SS to time object via datetime)
    start_time_str = rule['start_time']
    end_time_str = rule['end_time']
    slot_minutes = rule['slot_duration']

    start_dt = datetime.strptime(f"{date} {start_time_str}", "%Y-%m-%d %H:%M:%S")
    end_dt = datetime.strptime(f"{date} {end_time_str}", "%Y-%m-%d %H:%M:%S")

    # 2. Gerar todos os slots possíveis
    possible_slots = []
    current_slot = start_dt
    while current_slot + timedelta(minutes=slot_minutes) <= end_dt:
        possible_slots.append(current_slot)
        current_slot += timedelta(minutes=slot_minutes)

    # 3. Buscar agendamentos existentes para a data no modelo principal
    day_start = f"{date}T00:00:00"
    day_end = f"{query_date + timedelta(days=1)}T00:00:00"

    appts_res = supabase.table('appointments') \
        .select('date, duration_minutes, status') \
        .eq('user_id', str(user_id)) \
        .gte('date', day_start) \
        .lt('date', day_end) \
        .neq('status', 'cancelado') \
        .execute()
    
    appointments = appts_res.data

    # Helper para verificação de colisão
    def is_slot_free(slot_start: datetime, slot_end: datetime) -> bool:
        for appt in appointments:
            existing_start = datetime.fromisoformat(appt['date'].replace('Z', '+00:00')).replace(tzinfo=None)
            existing_end = existing_start + timedelta(minutes=appt.get('duration_minutes', 60) or 60)
            
            # Se colide
            if slot_start < existing_end and slot_end > existing_start:
                return False
        return True

    # 4. Filtrar slots validos (sem colisão e no futuro caso o dia seja hoje)
    available_slots_str = []
    now = datetime.now()
    
    for slot in possible_slots:
        # Ignorar slots que já passaram se for hoje
        if slot <= now:
            continue
            
        slot_end = slot + timedelta(minutes=slot_minutes)
        if is_slot_free(slot, slot_end):
            available_slots_str.append(slot.strftime("%Y-%m-%d %H:%M:%S"))

    return {
        "slots": available_slots_str,
        "date": date
    }
