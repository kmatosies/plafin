# Plafin - Ciclo 02 - Acoes manuais

Execute estas acoes somente depois de revisar e aprovar o PR do Ciclo 02.
Nunca cole valores de secrets em issue, PR, chat, log ou documento.

## Gate 1 - Decisoes antes do deploy

1. Escolher qual Price mensal BRL sera o Pro canonico no test mode: R$ 74,90
   ou R$ 79,90. A recomendacao tecnica e avaliar o Price BRL mais recente, mas
   nenhuma escolha foi feita pelo codigo.
2. Confirmar que IA, WhatsApp, SMTP e worker continuam desativados.
3. Aprovar a estrategia de baseline/migration do Supabase e uma janela com
   rollback.
4. Aprovar o commit exato da PR; nao usar o head antigo do PR #3.

## Tabela final de ambiente

### Backend / Render

| Variavel | Obrigatoriedade | Uso | No Render? | Formato esperado |
|---|---|---|---|---|
| `APP_NAME` | opcional | nome em metadata/health | sim, estatico | texto, `Plafin` |
| `FRONTEND_URL` | obrigatoria em producao | CORS, reset, Checkout e Portal | sim | URL HTTPS sem path |
| `FRONTEND_ORIGINS` | recomendada | origens CORS adicionais | sim | URLs HTTPS separadas por virgula |
| `BACKEND_URL` | opcional/reservada | URL publica canonica; hoje nao consumida por fluxo | sim, para consistencia | URL HTTPS sem path |
| `BUSINESS_TIMEZONE` | opcional | agenda/disponibilidade | sim, estatico | IANA, `America/Sao_Paulo` |
| `SUPABASE_URL` | obrigatoria | Auth e Data API | sim | `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | obrigatoria | fluxos Auth com privilegio de usuario | sim, secret | anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | obrigatoria | acesso administrativo do backend | sim, secret | service role key |
| `STRIPE_SECRET_KEY` | obrigatoria para billing | Checkout, Portal e API Stripe | sim, secret | chave de **test mode** |
| `STRIPE_WEBHOOK_SECRET` | obrigatoria para webhook | assinatura do endpoint | sim, secret | `whsec_...` de test mode |
| `STRIPE_PRICE_PRO_MONTHLY_BRL` | obrigatoria para checkout | Price permitido | sim | `price_...`, mensal, ativo, BRL, test mode |
| `ENABLE_NOTIFICATION_WORKER` | obrigatoria como gate | controla worker no processo API | sim | string `false` |
| `NOTIFICATION_WORKER_INTERVAL_SECONDS` | opcional | intervalo futuro | nao no ciclo atual | inteiro positivo; default 60 |
| `NOTIFICATION_WORKER_ERROR_BACKOFF_SECONDS` | opcional | backoff futuro | nao no ciclo atual | inteiro positivo; default 300 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Fase 2 | e-mail do worker | nao | SMTP valido; secrets onde aplicavel |
| `GEMINI_API_KEY` | Fase 2 | IA | nao | secret; vazio no runtime atual |
| `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` | Fase 2 | WhatsApp | nao | URL/secret/identificador |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | somente script local | bootstrap manual | nunca | valores efemeros locais |

Aliases temporarios aceitos, mas nao recomendados em configuracoes novas:

- `SUPABASE_KEY` -> `SUPABASE_ANON_KEY`;
- `SUPABASE_SERVICE_KEY` -> `SUPABASE_SERVICE_ROLE_KEY`;
- `STRIPE_PRICE_PRO_MONTHLY` -> `STRIPE_PRICE_PRO_MONTHLY_BRL`;
- `NOTIFICATION_WORKER_ENABLED` -> `ENABLE_NOTIFICATION_WORKER`.

Remover do Render se existirem:

- `STRIPE_PRICE_PRO_MONTHLY_USD`;
- `RESEND_API_KEY`;
- prices Starter/Enterprise;
- aliases legados depois de confirmar os nomes canonicos;
- qualquer `GEMINI_*`/Evolution/SMTP que nao sera usado neste ciclo.

### Frontend / Vercel

| Variavel | Obrigatoriedade | Uso | Escopo | Formato |
|---|---|---|---|---|
| `VITE_API_URL` | obrigatoria | base da API | Production e Preview | URL HTTPS do backend |
| `VITE_PRO_MONTHLY_PRICE_BRL` | opcional | exibicao publica | Production e Preview | decimal BRL, sem simbolo; alinhar ao Price |

Variaveis `VITE_*` sao publicas no bundle. Nao colocar chaves Supabase, Stripe
secret, webhook secret ou qualquer credencial nelas.

## Gate 2 - Supabase remoto

Projeto confirmado: `pmzqanfmqzndkrzvvvat`.

1. Abra **Supabase Dashboard > projeto > Database > Backups**. Confirme a
   politica disponivel no plano e gere backup logico por CLI/pg_dump se o plano
   nao oferecer snapshot sob demanda.
2. Registre separadamente a contagem de `auth.users`; as tabelas publicas
   estavam vazias, mas isso nao prova que Auth esteja vazio.
3. Compare o schema remoto com
   `supabase/migrations/20260921032751_remote_baseline.sql`.
4. Defina como registrar o baseline no historico remoto. Nao reaplique o
   baseline cegamente sobre objetos existentes.
5. Revise a migration
   `20260921032806_harden_rls_functions_and_indexes.sql`.
6. Somente com backup, diff e aprovacao: registre/aplique na ordem correta.
7. Rode novamente database lint, security advisor e performance advisor.
8. Em **Authentication > Settings > Password Security**, aumente a politica de
   senha e habilite leaked-password protection se o plano permitir. O recurso
   e documentado como disponivel em planos Pro ou superiores.

Aceite esperado:

- `stripe_webhook_events` continua com RLS;
- `anon` e `authenticated` nao escrevem nessa tabela;
- o backend reserva eventos somente como `service_role`;
- funcoes `SECURITY DEFINER` nao sao executaveis por papeis publicos;
- core tables mantem acesso `authenticated` apenas sob RLS;
- tabelas internas de IA/WhatsApp/outbox nao sao expostas.

Referencias oficiais:

- <https://supabase.com/docs/guides/database/database-linter>
- <https://supabase.com/docs/guides/auth/password-security>

## Gate 3 - Render

Servico atual:
<https://dashboard.render.com/web/srv-d70p7e1aae7s73bgv9l0>

1. Em **Settings**, confirme repositorio `kmatosies/plafin` e branch `main`.
2. Em **Environment**, compare apenas nomes com a tabela acima. Preencha os
   secrets pelo painel e remova extras obsoletos.
3. Em **Blueprints**, conecte/sincronize o `render.yaml` somente depois de ele
   estar aprovado na `main`. Revise o preview antes de aplicar.
4. Confirme no preview: service `plafin`, type Web, plan Free, runtime Docker,
   Dockerfile `./backend/Dockerfile`, context `./backend`, root na raiz do
   repositorio e health path `/health`.
5. Nao defina Build Command ou Start Command de runtime Python. O `CMD` esta
   na imagem.
6. O Render permite alterar runtime de servico nao estatico, mas o preview da
   sincronizacao e a fonte de verdade: se propuser recurso duplicado ou mudanca
   destrutiva, cancele e nao aplique.
7. Faça deploy manual do commit aprovado e acompanhe o primeiro erro real nos
   logs de build/runtime.
8. Exija:
   - deploy `Live`;
   - `GET /health` 200 em ate 10 s;
   - `GET /docs` 200;
   - nenhum loop de restart;
   - log confirmando worker desativado, sem stack trace de optional integrations.

Observacao do Blueprint: valores `sync: false` precisam ser preenchidos no
Dashboard; uma sincronizacao de Blueprint nao inventa nem atualiza esses
secrets.

Referencia oficial:
<https://render.com/docs/blueprint-spec>

## Gate 4 - Stripe test mode

1. No Stripe Dashboard, ative **Test mode** antes de qualquer acao.
2. Em **Product catalog**, escolha um unico Price mensal BRL do Pro.
3. Nao crie R$ 44,90 neste ciclo e nao altere/arquive objetos atuais.
4. Configure o ID escolhido em `STRIPE_PRICE_PRO_MONTHLY_BRL` no Render.
5. Configure o mesmo valor comercial de exibicao em
   `VITE_PRO_MONTHLY_PRICE_BRL` na Vercel, sem expor o Price ID se nao houver
   necessidade.
6. Em **Developers > Webhooks**, confira o endpoint
   `https://plafin.onrender.com/api/stripe/webhook`, test mode e secret correto.
7. Depois do backend verde, teste Checkout, cancelamento/retorno, Portal,
   `invoice.paid`, falha e reenvio do mesmo evento.
8. Confirme no Supabase que a repeticao nao cria efeito duplicado.

Proposta de limpeza futura, sem autorizacao de execucao: consolidar os dois
produtos `Plafin Pro`, remover USD do caminho da aplicacao e arquivar Prices
duplicados apenas depois de mapear assinaturas/dependencias.

## Gate 5 - Vercel

1. Abra **Project plafin > Settings > Environments > Production > Branch
   Tracking** e confirme `main`.
2. Em **Settings > Environment Variables**, configure `VITE_API_URL` e,
   depois da decisao comercial, `VITE_PRO_MONTHLY_PRICE_BRL` para Production
   e Preview.
3. Em **Settings > Domains**, confirme `plafin.online` e
   `www.plafin.online` associados ao ambiente Production.
4. Gere novo Preview da PR e rode smoke tests contra o backend aprovado.
5. Depois do merge aprovado, faça novo deploy Production. Alteracoes de env so
   afetam novos deployments.

Referencia oficial:
<https://vercel.com/docs/environment-variables>

## Gate 6 - GitHub

1. Revisar a nova PR e seu checklist.
2. Nao fazer merge antes dos Gates 1 e 2 estarem decididos.
3. Depois que a nova PR substituir formalmente a #3, comentar o link de
   substituicao nela; fechar somente com confirmacao.
4. Apos merge e estabilizacao, revisar `master` e
   `fix/render-production-config`. Excluir branches remotas somente com
   confirmacao explicita.

## Rollback

- Codigo: redeploy do ultimo commit conhecido como estavel; nao reescrever
  `main`.
- Render: preservar o deploy anterior ate o health e smoke novos passarem.
- Vercel: promover/redeployar o ultimo Production aprovado.
- Supabase: parar ao primeiro erro. Usar migration compensatoria revisada ou
  restaurar o backup; nunca improvisar `DROP` em producao.
- Stripe: como o ciclo nao altera catalogo, rollback e remover a env escolhida e
  desabilitar temporariamente o fluxo de checkout.
- Secrets: se qualquer valor aparecer em log/documento, revogar e rotacionar no
  provedor antes de continuar.
