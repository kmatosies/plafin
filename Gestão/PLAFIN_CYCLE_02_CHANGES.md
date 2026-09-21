# Plafin - Ciclo 02 - Mudancas aplicadas

Todas as mudancas foram feitas na branch `fix/cycle-02-backend-docker`, criada
da `origin/main` atual. Nenhuma logica de negocio fora do escopo foi alterada
silenciosamente.

## Configuracao e startup

| Arquivos | Mudanca | Justificativa |
|---|---|---|
| `backend/app/config/__init__.py` | nomes canonicos, aliases temporarios, `extra="ignore"`, URLs normalizadas, worker false | impedir o ValidationError e alinhar ambiente |
| `backend/.env.example` | inventario sem secrets, Stripe BRL e features de Fase 2 vazias | fonte de nomes para local/Render |
| `backend/app/main.py` | startup tolerante, health independente, rotas IA desmontadas | API deve subir sem opcionais |
| `backend/app/services/ai_finance_agent.py`, `ai_whatsapp_agent.py` | clientes externos lazy | impedir falha durante import |
| `backend/app/services/notification_service.py` | falhas opcionais logadas e envio so marcado apos sucesso | worker nao derruba API nem gera falso positivo |

## API, autenticacao e isolamento

| Arquivos | Mudanca | Justificativa |
|---|---|---|
| `backend/app/database.py` | cliente admin separado e cliente anon novo por fluxo auth | evitar contaminacao de sessao global |
| `backend/app/middleware/auth.py` | respostas 401 seguras, sem logar token | seguranca e contrato HTTP |
| `backend/app/middleware/access_control.py` | consultas sem `.single()` em zero linhas | evitar 500 onde cabia ausencia/negacao |
| `backend/app/routers/auth.py` | schemas validados, reset com tokens e clientes isolados | corrigir login/reset/logout |
| `backend/app/routers/clients.py` | ownership e 404 consistentes | impedir acesso cross-tenant |
| `backend/app/routers/transactions.py` | filtros finais por usuario e 404 consistentes | isolamento do financeiro |
| `backend/app/routers/appointments.py` | ownership do cliente, UTC no banco, timezone de exibicao e conflito 409 | consistencia de agenda |
| `backend/app/routers/availability.py` | contrato de disponibilidade alinhado | corrigir divergencia frontend/API |
| `backend/app/routers/subscriptions.py` | respostas e consultas seguras | evitar 500 e manter billing autenticado |
| `backend/app/schemas/*.py` alterados | validacao de entrada e contrato atualizado | rejeitar payloads invalidos cedo |
| `backend/app/services/usage_service.py` | contador ausente tratado corretamente | eliminar erro com registro inexistente |

## Stripe

| Arquivos | Mudanca | Justificativa |
|---|---|---|
| `backend/app/services/stripe_service.py` | SDK atual, Price BRL configurado, validacao da fonte, idempotencia e RPC atomica | evitar moeda/Price arbitrario e corrida de webhook |
| `backend/app/routers/stripe_webhook.py` | endpoint dedicado com verificacao de assinatura | separar webhook de rotas autenticadas |
| `backend/app/config/plans.py` | somente Free/Pro publicos; legados normalizados; IA/WhatsApp removidos dos direitos atuais | refletir decisoes de Fase 1 |

Nenhum produto ou Price remoto foi modificado. O codigo nao escolhe entre R$
74,90 e R$ 79,90; essa e uma decisao comercial pendente.

## Docker, Render e dependencias

| Arquivos | Mudanca | Justificativa |
|---|---|---|
| `backend/Dockerfile` | Python 3.11.11, instalacao deterministica, usuario nao-root, health check e `PORT` | runtime reproduzivel no Render |
| `backend/.dockerignore` | exclui envs, caches, testes, scripts e SQL | reduzir contexto e impedir inclusao acidental |
| `render.yaml` | runtime Docker, branch `main`, paths e envs canonicas | substituir runtime Python divergente |
| `backend/requirements.txt` | dependencias de producao atualizadas e superficie reduzida | remover vulnerabilidades e opcionais do boot |
| `backend/requirements-phase2.txt` | Gemini isolado do runtime atual | manter Fase 2 fora da imagem |
| `backend/requirements-dev.txt`, `backend/pytest.ini` | tooling/testes fixados | execucao repetivel |

`python-jose`, `passlib`, `python-multipart`, `aiohttp` e Gemini foram
retirados da imagem de producao por nao serem necessarios ao runtime atual e
por ampliarem a superficie de vulnerabilidades.

## Supabase

| Arquivos | Mudanca | Justificativa |
|---|---|---|
| `package.json`, `package-lock.json` | Supabase CLI 2.117.0 fixado e scripts locais | fluxo de banco reproduzivel |
| `supabase/config.toml` e arquivos auxiliares | projeto local em Postgres 17 | paridade com remoto |
| `supabase/migrations/20260921032751_remote_baseline.sql` | snapshot do schema remoto encontrado | iniciar historico sem adivinhar estado |
| `supabase/migrations/20260921032806_harden_rls_functions_and_indexes.sql` | search paths, grants, RPC Stripe, policies, indices e exclusao de conflito | corrigir alerts e concorrencia |
| `supabase/tests/rls.test.sql` | 25 checks pgTAP | comprovar RLS, grants, indices e idempotencia |
| `supabase/seed.sql` | seed local controlado | suportar reset local sem dados reais |

O antigo script isolado de webhook no diretorio `backend` foi removido para
nao competir com o fluxo oficial de migrations.

## Frontend

| Arquivos | Mudanca | Justificativa |
|---|---|---|
| `frontend/src/lib/api.ts` | tipos e rotas de disponibilidade alinhados | restaurar contrato com backend |
| `frontend/src/pages/ResetPassword.tsx` | efeito e tokens de sessao corrigidos | lint e fluxo de recuperacao |
| `frontend/src/pages/Assinatura.tsx` | BRL apenas, sem USD/WhatsApp e sem preco falso | evitar promessa/valor divergente |
| `frontend/.env.example` | URL da API e preco publico opcional | separar endpoint de valor comercial |
| `frontend/package-lock.json` | arvore auditada | remover vulnerabilidades conhecidas |

Quando `VITE_PRO_MONTHLY_PRICE_BRL` estiver vazio, a tela pede para consultar
o checkout em vez de inventar um preco.

## Scripts e documentacao

- `backend/scripts/create_admin.py`, `create_admin_rest.py`,
  `verify_admin.py`: envs canonicas e clientes atuais.
- `backend/scripts/setup_stripe.py`: verificador somente leitura; nao cria
  objetos Stripe.
- `README.md`, `backend/README.md`, `docs/deploy.md`: runtime e
  procedimentos atualizados.
- `backend/tests/*`: cobertura de settings, startup, auth, agenda, planos,
  Stripe e usage.
- `Gestão/PLAFIN_CYCLE_02_*.md`: handoff verificavel deste ciclo.

## Alteracoes de negocio explicitamente justificadas

1. O produto publico ficou restrito a Free e Pro em BRL, conforme decisao do
   Ciclo 01.
2. Registros legados `starter` e `enterprise` sao normalizados para Pro para
   evitar perda de acesso existente.
3. IA e WhatsApp deixaram os direitos exibidos no Pro porque estao fora da Fase
   1 e nao devem ser prometidos enquanto desativados.
4. Conflitos de horario retornam 409 e tambem possuem protecao no banco, porque
   uma verificacao apenas na aplicacao e vulneravel a concorrencia.
