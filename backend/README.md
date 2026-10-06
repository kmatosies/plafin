# Backend do Plafin

API FastAPI para autenticacao, clientes, financeiro, agenda, disponibilidade e
assinaturas Stripe.

## Requisitos

- Python 3.11
- Supabase local ou gerenciado
- Docker para a imagem de producao

## Setup local

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt -r requirements-dev.txt
Copy-Item .env.example .env
```

Preencha apenas valores locais no `.env`. Gemini, Evolution, SMTP e o worker
nao sao necessarios para importar ou iniciar a API.

```powershell
uvicorn app.main:app --reload --port 8000
```

- Health: <http://localhost:8000/health>
- Swagger: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>

## Testes

```powershell
python -m pytest
```

O teste de integracao com Supabase local e opt-in e cria usuarios e dados.
Antes de executa-lo, confirme um projeto local exclusivo e descartavel na URL
exata `http://127.0.0.1:55321` da stack `plafin03b`, com worker desativado e plano de cleanup.
Nao use stack compartilhada nem remota. O guard do teste rejeita outros destinos,
mas nao comprova sozinho a identidade dos volumes locais; confirme os containers
e volumes `*_plafin03b` antes de ativar o teste.

```powershell
$env:RUN_LOCAL_INTEGRATION='1'
$env:PLAFIN_TEST_STACK_DISPOSABLE='1'
$env:ENABLE_NOTIFICATION_WORKER='false'
python -m pytest tests/integration/test_local_stack.py -q
```

## Docker

```powershell
docker build -t plafin-backend:local .
docker run --rm -p 127.0.0.1:8000:8000 -e ENABLE_NOTIFICATION_WORKER=false plafin-backend:local
```

A imagem roda como usuario nao-root, respeita `PORT` e possui health check.
O worker permanece desabilitado por padrao no servico web.

## Variaveis

Use `.env.example` como fonte de nomes. Em configuracoes novas, use:

- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_PRICE_PRO_MONTHLY_BRL`
- `ENABLE_NOTIFICATION_WORKER=false`

Aliases legados sao apenas uma ponte de migracao. O Stripe deve permanecer em
test mode e o Price selecionado deve ser mensal e em BRL.

As integracoes de IA ficam em `requirements-phase2.txt` e nao fazem parte da
imagem de producao atual.

Veja `../docs/deploy.md` e os relatorios dos ciclos no diretorio `Gestão/`
do checkout principal.
