# 🚀 SaaS Finance Agenda — Backend

API backend do sistema SaaS de gestão financeira, agenda e automação com IA.

## Stack Tecnológico

- **Python 3.11+** + **FastAPI**
- **Supabase** (PostgreSQL + Auth)
- **Stripe** (Pagamentos e assinaturas)
- **Google Gemini** (IA Financeira)
- **Evolution API** (WhatsApp)

## Setup Rápido

### 1. Criar ambiente virtual e instalar dependências

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/Mac
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com suas chaves
```

### 3. Configurar Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **SQL Editor** e execute o conteúdo de `supabase_schema.sql`
3. Copie a **URL** e as **chaves** (anon e service_role) para o `.env`

### 4. Executar o servidor

```bash
uvicorn app.main:app --reload --port 8000
```

### 5. Acessar documentação

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Estrutura do Projeto

```
backend/
├── app/
│   ├── main.py              # FastAPI app principal
│   ├── config.py             # Variáveis de ambiente
│   ├── database.py           # Conexão Supabase
│   ├── middleware/
│   │   └── auth.py           # Autenticação JWT
│   ├── routers/
│   │   ├── auth.py           # Registro, login, reset
│   │   ├── dashboard.py      # Dados do dashboard
│   │   ├── transactions.py   # CRUD transações
│   │   ├── appointments.py   # CRUD agendamentos
│   │   ├── clients.py        # CRUD clientes
│   │   ├── subscriptions.py  # Stripe checkout/portal
│   │   └── ai.py             # Agentes de IA
│   ├── services/
│   │   ├── supabase_service.py
│   │   ├── stripe_service.py
│   │   ├── ai_finance_agent.py
│   │   └── ai_whatsapp_agent.py
│   └── schemas/
│       ├── user.py
│       ├── transaction.py
│       ├── appointment.py
│       └── client.py
├── supabase_schema.sql       # SQL para criar tabelas
├── requirements.txt
├── .env.example
└── README.md
```

## Endpoints Principais

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Registrar usuário |
| POST | `/api/auth/login` | Login |
| GET | `/api/dashboard/` | Dados do dashboard |
| GET/POST | `/api/transactions/` | Listar/criar transações |
| GET/POST | `/api/appointments/` | Listar/criar agendamentos |
| GET/POST | `/api/clients/` | Listar/criar clientes |
| POST | `/api/subscriptions/create-checkout` | Criar checkout Stripe |
| POST | `/api/ai/finance/analyze` | Análise financeira IA |
| POST | `/api/ai/finance/chat` | Chat com IA financeira |
| POST | `/api/ai/whatsapp/webhook` | Webhook WhatsApp |

## Planos

| Plano | Recursos |
|---|---|
| **Free** | Dashboard básico, até 50 transações/mês |
| **Pro** | Dashboard completo + IA financeira |
| **Enterprise** | Tudo + automação WhatsApp |
