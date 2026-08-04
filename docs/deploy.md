# Deploy

## Frontend na Vercel

- Root do projeto: repositorio raiz
- Install command: `npm install --prefix frontend`
- Build command: `npm run build --prefix frontend`
- Output directory: `frontend/dist`
- Framework preset: `Other` ou `Vite`
- Rewrite SPA: configurado em `vercel.json`

Variaveis:

- `VITE_API_URL=https://SEU-BACKEND.onrender.com`

## Backend no Render

- Blueprint opcional: `render.yaml`
- Production branch: `main`
- Root dir: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/health`
- Python: `3.11.11` via `.python-version`

Variaveis obrigatorias:

- `APP_NAME=Plafin`
- `ENABLE_NOTIFICATION_WORKER=false`
- `FRONTEND_URL=https://SEU-FRONTEND.vercel.app`
- `FRONTEND_ORIGINS=https://SEU-FRONTEND.vercel.app`
- `BACKEND_URL=https://SEU-BACKEND.onrender.com`
- `SUPABASE_URL=...`
- `SUPABASE_ANON_KEY=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`

Variaveis adicionais conforme features ativas:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER_MONTHLY`
- `STRIPE_PRICE_PRO_MONTHLY_BRL`
- `STRIPE_PRICE_PRO_MONTHLY_USD`
- `GEMINI_API_KEY`
- `RESEND_API_KEY` (reservada; o worker atual usa SMTP)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE`

Aliases temporarios e depreciados:

- `SUPABASE_KEY` -> `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY` -> `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_PRICE_PRO_MONTHLY` -> `STRIPE_PRICE_PRO_MONTHLY_BRL`

## Notification worker

Mantenha `ENABLE_NOTIFICATION_WORKER=false` no primeiro deploy. Para ativar,
valide antes `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM`.
`RESEND_API_KEY` ainda nao e consumida pelo codigo.

Falhas de Supabase ou SMTP sao registradas com stack trace e o loop tenta
novamente sem encerrar a API.

## Testes do backend

- Dependencias de producao: `pip install -r requirements.txt`
- Dependencias de desenvolvimento: `pip install -r requirements-dev.txt`
- Testes unitarios/startup: `pytest`
- `scripts/test_agenda_logic.py` e um teste de integracao manual que requer
  Supabase acessivel e nao faz parte da suite unitaria.

## Ordem recomendada

1. Publicar o backend no Render e confirmar `GET /health`
2. Copiar a URL publica do backend
3. Cadastrar `VITE_API_URL` na Vercel
4. Publicar o frontend na Vercel
5. Atualizar `FRONTEND_URL` e `FRONTEND_ORIGINS` no Render com a URL final da Vercel
6. Fazer novo deploy do backend
