import os
import sys
from pathlib import Path

# Adiciona a raiz do backend ao path
sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from supabase import create_client, Client

def verify_admin():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    supabase_service_key = os.environ.get("SUPABASE_SERVICE_KEY")

    # Credenciais do admin encontradas no script de seed
    admin_email = "kmatos_ies@hotmail.com"
    admin_password = "Pl@fin022"

    print(f"--- Verificando usuario: {admin_email} ---")
    
    # 1. Tentar Login (Verifica Supabase Auth)
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        auth_res = supabase.auth.sign_in_with_password({
            "email": admin_email,
            "password": admin_password
        })
        print("[OK] Autenticacao: OK (Usuario e senha validos)")
        
        user_id = auth_res.user.id
        
        # 2. Verificar Perfil (Verifica Tabela Profiles)
        admin_client: Client = create_client(supabase_url, supabase_service_key)
        profile_res = admin_client.table("profiles").select("*").eq("id", user_id).single().execute()
        
        if profile_res.data:
            profile = profile_res.data
            print(f"[OK] Perfil no Banco: OK")
            print(f"   Nome: {profile.get('full_name')}")
            print(f"   Plano: {profile.get('plan')}")
            print(f"   Role: {profile.get('role', 'N/A')}")
        else:
            print("[ERRO] Usuario autenticado, mas perfil NAO encontrado na tabela 'profiles'.")

    except Exception as e:
        print(f"[ERRO] na verificacao: {str(e)}")

if __name__ == "__main__":
    verify_admin()
