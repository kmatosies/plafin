# Plafin

SaaS para gestao financeira e agenda, com frontend em React/Vite e backend em FastAPI.

## Estrutura

- `frontend/`: aplicacao web (React + TypeScript + Vite)
- `backend/`: API (FastAPI + Supabase + Stripe + IA)
- `docs/`: termos, politica de privacidade e notas de deploy
- `render.yaml` e `vercel.json`: arquivos de base para deploy

## Setup rapido local

### 1) Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/Mac
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Estado atual de integracoes

- `Render`: configuracao inicial criada, ajustes finais pendentes
- `Vercel`: configuracao inicial criada, ajustes finais pendentes
- `Resend`: ainda nao configurado

## Fluxo recomendado no GitHub

- manter `main` estavel
- criar branch por feature/correcao
- abrir PR com descricao curta e checklist de teste
- versionar alteracoes de schema/scripts junto com alteracoes da API
