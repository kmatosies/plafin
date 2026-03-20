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
- Root dir: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/health`

Variaveis obrigatorias:

- `APP_NAME=FinanceAgenda`
- `FRONTEND_URL=https://SEU-FRONTEND.vercel.app`
- `FRONTEND_ORIGINS=https://SEU-FRONTEND.vercel.app`
- `BACKEND_URL=https://SEU-BACKEND.onrender.com`
- `SUPABASE_URL=...`
- `SUPABASE_KEY=...`
- `SUPABASE_SERVICE_KEY=...`

Variaveis adicionais conforme features ativas:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER_MONTHLY`
- `STRIPE_PRICE_PRO_MONTHLY`
- `GEMINI_API_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE`

## Ordem recomendada

1. Publicar o backend no Render e confirmar `GET /health`
2. Copiar a URL publica do backend
3. Cadastrar `VITE_API_URL` na Vercel
4. Publicar o frontend na Vercel
5. Atualizar `FRONTEND_URL` e `FRONTEND_ORIGINS` no Render com a URL final da Vercel
6. Fazer novo deploy do backend
