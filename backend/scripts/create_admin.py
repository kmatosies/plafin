"""
Script de seed — Cria usuário admin no Supabase Auth.

EXECUÇÃO: python backend/scripts/create_admin.py
REQUERIMENTOS: .env configurado com SUPABASE_URL e SUPABASE_SERVICE_KEY

⚠️ Execute este script UMA ÚNICA VEZ em cada ambiente (local / produção).
⚠️ Nunca comite credenciais hardcoded no repositório.
"""

import os
import sys
from pathlib import Path

# Adiciona a raiz do backend ao path para importar configurações
sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from supabase import create_client, Client


def create_admin_user():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_service_key = os.environ.get("SUPABASE_SERVICE_KEY")

    if not supabase_url or not supabase_service_key:
        print("❌ ERRO: Configure SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo backend/.env")
        sys.exit(1)

    # Credenciais do admin (defina via variáveis de ambiente ou edite aqui)
    admin_email = os.environ.get("ADMIN_EMAIL", "kmatos_ies@hotmail.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Pl@fin022")
    admin_name = os.environ.get("ADMIN_NAME", "Admin Plafin")

    supabase: Client = create_client(supabase_url, supabase_service_key)

    print(f"🔧 Criando usuário admin: {admin_email}")

    try:
        # Cria o usuário via Admin API do Supabase
        response = supabase.auth.admin.create_user({
            "email": admin_email,
            "password": admin_password,
            "email_confirm": True,  # Confirma o email automaticamente (sem precisar verificar e-mail)
            "user_metadata": {
                "full_name": admin_name,
                "role": "admin",
            }
        })

        user_id = response.user.id
        print(f"✅ Usuário criado com ID: {user_id}")

        # Atualiza o perfil na tabela 'profiles' com plano PRO e role admin
        supabase.table("profiles").upsert({
            "id": user_id,
            "full_name": admin_name,
            "email": admin_email,
            "plan": "pro",
            "role": "admin",
            "subscription_status": "active",
        }).execute()

        print("✅ Perfil admin configurado no banco de dados (plano PRO, role admin)")
        print("\n🎉 Usuário admin criado com sucesso!")
        print(f"   Email: {admin_email}")
        print("   Role: admin | Plano: PRO")

    except Exception as e:
        error_msg = str(e)
        if "already registered" in error_msg or "already been registered" in error_msg:
            print(f"⚠️  Usuário {admin_email} já existe no Supabase.")
            print("   Se quiser redefinir a senha, acesse o painel do Supabase manualmente.")
        else:
            print(f"❌ Erro ao criar usuário: {error_msg}")
            sys.exit(1)


if __name__ == "__main__":
    create_admin_user()
