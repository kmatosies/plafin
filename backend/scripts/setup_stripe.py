import stripe
import os
import sys

# Adicionar diretório pai ao path para importar config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

stripe_key = os.getenv("STRIPE_SECRET_KEY")

if not stripe_key or "sk_test" not in stripe_key:
    print("❌ ERRO: Chave STRIPE_SECRET_KEY não encontrada ou inválida no .env")
    print("Por favor, configure sua chave secreta de teste do Stripe no arquivo .env antes de rodar este script.")
    sys.exit(1)

stripe.api_key = stripe_key

def create_products():
    print("🚀 Iniciando configuração automática do Stripe...")
    
    products = {
        "pro": {
            "name": "Finance Agenda Pro",
            "prices": {
                "monthly": 4990,  # R$ 49,90
                "semiannual": 26940, # R$ 44,90 * 6 = 269,40 (10% off)
                "annual": 47900,     # R$ 39,90 * 12 = 478,80 -> arredondando 479,00
            }
        },
        "enterprise": {
            "name": "Finance Agenda Enterprise",
            "prices": {
                "monthly": 9990,  # R$ 99,90
                "semiannual": 53940, # R$ 89,90 * 6 = 539,40 (10% off)
                "annual": 95880,     # R$ 79,90 * 12 = 958,80 (20% off)
            }
        }
    }
    
    generated_env_lines = []
    
    for plan_key, plan_data in products.items():
        print(f"\n📦 Configurando Produto: {plan_data['name']}...")
        
        # 1. Criar ou buscar produto
        try:
            # Tentar buscar produto existente pelo nome (busca simples)
            existing = stripe.Product.search(query=f"name:\"{plan_data['name']}\"", limit=1)
            if existing and existing.data:
                product = existing.data[0]
                print(f"   ✅ Produto já existe: {product.id}")
            else:
                product = stripe.Product.create(name=plan_data['name'])
                print(f"   ✨ Produto criado: {product.id}")
        except Exception as e:
            print(f"   ❌ Erro ao buscar/criar produto: {e}")
            continue
            
        # 2. Criar preços
        for cycle, amount in plan_data["prices"].items():
            interval = "month"
            interval_count = 1
            if cycle == "semiannual":
                interval_count = 6
            elif cycle == "annual":
                interval = "year"
                
            print(f"   💲 Criando preço {cycle} (R$ {amount/100:.2f})...")
            
            try:
                price = stripe.Price.create(
                    unit_amount=amount,
                    currency="brl",
                    recurring={"interval": interval, "interval_count": interval_count},
                    product=product.id,
                    nickname=f"{cycle.capitalize()} Plan",
                )
                print(f"      ✅ Preço criado: {price.id}")
                
                # Guardar linha para o .env
                env_key = f"STRIPE_PRICE_{plan_key.upper()}_{cycle.upper()}"
                generated_env_lines.append(f"{env_key}={price.id}")
                
            except Exception as e:
                print(f"      ❌ Erro ao criar preço: {e}")

    print("\n\n✅ Configuração concluída!")
    print("Copie as linhas abaixo e cole no seu arquivo backend/.env:\n")
    print("-" * 50)
    for line in generated_env_lines:
        print(line)
    print("-" * 50)

if __name__ == "__main__":
    create_products()
