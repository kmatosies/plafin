# Deploy do Plafin

Este documento descreve o estado preparado no Ciclo 02. Ele nao autoriza deploy,
alteracao de banco remoto nem mudanca no Stripe.

## Ordem de publicacao

1. Revisar e aprovar o PR do Ciclo 02.
2. Escolher um unico Price mensal Pro em BRL no Stripe test mode.
3. Fazer backup logico do Supabase e revisar o diff das migrations.
4. Aplicar/registrar o baseline e as migrations remotas com aprovacao explicita.
5. Sincronizar o Blueprint do Render e fazer deploy do commit aprovado.
6. Exigir `HTTP 200` em `/health` e validar `/docs`.
7. Configurar a Vercel e publicar o frontend.
8. Executar smoke tests integrados antes de qualquer promocao.

## Backend no Render

O backend usa `runtime: docker` e o `CMD` definido em
`backend/Dockerfile`. Nao configure Build Command ou Start Command de runtime
Python.

| Campo | Valor |
|---|---|
| Branch | `main` |
| Root Directory | vazio / raiz do repositorio |
| Dockerfile Path | `./backend/Dockerfile` |
| Docker Context | `./backend` |
| Health Check Path | `/health` |
| Auto Deploy | conforme politica aprovada; o Blueprint usa `commit` |

Variaveis minimas:

- `APP_NAME=Plafin`
- `FRONTEND_URL=https://plafin.online`
- `FRONTEND_ORIGINS=https://plafin.online,https://www.plafin.online`
- `BACKEND_URL=https://plafin.onrender.com`
- `BUSINESS_TIMEZONE=America/Sao_Paulo`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENABLE_NOTIFICATION_WORKER=false`

Para ativar assinatura em test mode:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY_BRL`

Nao configurar no servico atual:

- `RESEND_API_KEY` (nao consumida)
- `STRIPE_PRICE_PRO_MONTHLY_USD` (fora do produto BRL)
- `GEMINI_API_KEY` e variaveis Evolution (Fase 2)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_NAME` (scripts locais)

Os aliases legados `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY`,
`STRIPE_PRICE_PRO_MONTHLY` e `NOTIFICATION_WORKER_ENABLED` sao aceitos
temporariamente pelo codigo, mas nao devem ser usados em configuracoes novas.

## Frontend na Vercel

| Campo | Valor |
|---|---|
| Production Branch | `main` |
| Root Directory | raiz do repositorio |
| Install Command | `npm install --prefix frontend` |
| Build Command | `npm run build --prefix frontend` |
| Output Directory | `frontend/dist` |

Variaveis publicas:

- `VITE_API_URL=https://plafin.onrender.com` (obrigatoria)
- `VITE_PRO_MONTHLY_PRICE_BRL` (opcional; valor decimal de exibicao, somente
  depois da decisao comercial)

Variaveis `VITE_*` sao incorporadas ao bundle e nunca podem conter secrets.
O aviso atual de chunk acima de 500 kB e de performance e nao bloqueia o build.

## Supabase

O remoto possui schema, mas nao possui historico de migrations. Nao execute
`supabase db push` cegamente.

Antes de qualquer escrita remota:

1. gerar backup logico;
2. comparar o schema remoto com
   `supabase/migrations/20260921032751_remote_baseline.sql`;
3. decidir e registrar como o baseline sera marcado no historico remoto;
4. revisar
   `20260921032806_harden_rls_functions_and_indexes.sql`;
5. aplicar em janela controlada e rodar advisors e smoke tests novamente.

## Validacao pos-deploy

```bash
curl --fail --max-time 10 https://plafin.onrender.com/health
curl --fail --max-time 10 https://plafin.onrender.com/docs
```

Depois, validar login, isolamento entre usuarios, clientes, transacoes,
disponibilidade, conflito de agenda, checkout BRL, portal e reenvio do mesmo
webhook. O status `Live` no painel nao substitui essas verificacoes.

Consulte os relatorios em `gestao/02-fases/fase-01-mvp/ciclo-02-estabilizacao/2026-09-21-execucao-01/relatorios/` para evidencias,
riscos, rollback e passos manuais detalhados.
