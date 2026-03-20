"""
Script alternativo — Cria usuário admin no Supabase via chamada REST direta.
Usa a API de Admin do Supabase sem depender do SDK Python (que exige JWT padrão).
"""

import os
import sys
import requests
from pathlib import Path

# Carrega o .env manualmente
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ.setdefault(key.strip(), val.strip())

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SERVICE_KEY:
    print("❌ ERRO: Configure SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo backend/.env")
    sys.exit(1)

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "kmatos_ies@hotmail.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Pl@fin022")
ADMIN_NAME = os.environ.get("ADMIN_NAME", "Admin Plafin")

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json"
}

print(f"🔧 Criando usuário admin: {ADMIN_EMAIL}")

# 1. Criar usuário via Admin API
create_url = f"{SUPABASE_URL}/auth/v1/admin/users"
payload = {
    "email": ADMIN_EMAIL,
    "password": ADMIN_PASSWORD,
    "email_confirm": True,
    "user_metadata": {
        "full_name": ADMIN_NAME,
        "role": "admin"
    }
}

resp = requests.post(create_url, json=payload, headers=headers)

if resp.status_code in (200, 201):
    user_data = resp.json()
    user_id = user_data.get("id")
    print(f"✅ Usuário criado com ID: {user_id}")
elif resp.status_code == 422 and "already" in resp.text.lower():
    print(f"⚠️ Usuário {ADMIN_EMAIL} já existe no Supabase.")
    # Buscar o ID do usuário existente
    list_resp = requests.get(f"{SUPABASE_URL}/auth/v1/admin/users", headers=headers)
    for u in list_resp.json().get("users", []):
        if u.get("email") == ADMIN_EMAIL:
            user_id = u.get("id")
            print(f"   ID existente: {user_id}")
            break
    else:
        print("   Não foi possível encontrar o ID do usuário existente.")
        sys.exit(0)
else:
    print(f"❌ Erro ao criar usuário: {resp.status_code} - {resp.text}")
    sys.exit(1)

# 2. Atualizar/inserir na tabela profiles
if user_id:
    profiles_url = f"{SUPABASE_URL}/rest/v1/profiles"
    profile_payload = {
        "id": user_id,
        "full_name": ADMIN_NAME,
        "email": ADMIN_EMAIL,
        "plan": "pro",
        "role": "admin",
        "subscription_status": "active"
    }
    # Usar upsert (POST com Prefer: resolution=merge-duplicates)
    upsert_headers = {**headers, "Prefer": "resolution=merge-duplicates"}
    upsert_resp = requests.post(profiles_url, json=profile_payload, headers=upsert_headers)
    
    if upsert_resp.status_code in (200, 201):
        print("✅ Perfil admin configurado no banco de dados (plano PRO, role admin)")
    else:
        print(f"⚠️ Perfil não pôde ser inserido (tabela profiles pode não existir ainda): {upsert_resp.status_code} - {upsert_resp.text[:300]}")

print("\n🎉 Processo de criação do admin concluído!")
print(f"   Email: {ADMIN_EMAIL}")
print(f"   Senha: {ADMIN_PASSWORD}")
print("   Role: admin | Plano: PRO")
print("\n⚠️  IMPORTANTE: Execute o script SQL de migração no Supabase antes de usar o sistema!")
