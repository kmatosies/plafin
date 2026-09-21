# Plafin - Ciclo 02 - Baseline e causa raiz

Data da verificacao: 21/09/2026 (America/Sao_Paulo)

## Resultado executivo

Status do ciclo: **PARCIALMENTE CONCLUIDO**.

O backend foi recuperado e validado localmente, inclusive dentro da imagem
Docker. O codigo, o Blueprint, as migrations e os testes estao preparados para
revisao. O ciclo ainda nao pode ser declarado concluido porque nenhuma mudanca
foi aplicada ao Supabase ou Render remotos, o backend publico continua sem
responder e o Price BRL canonico ainda depende de decisao humana.

## Baseline Git

- Repositorio: `kmatosies/plafin`.
- Base usada: `origin/main` em
  `d0085c58d231aee7c88635363eda2e28b113ae22`.
- Branch nova: `fix/cycle-02-backend-docker`.
- O worktree original em `master` estava sujo e nao foi alterado.
- PR #3: draft, head `ce425612c520ed5ea8d78a07b71db602ca773382`,
  base divergente. Foi usado apenas como referencia.
- `master` contem os commits exclusivos `be3ac98` e `f576445`, mas ficou
  atras da seguranca ja integrada em `main`. Nao deve ser mesclada inteira.
- Nenhuma branch remota foi removida.

## Causa raiz demonstrada

Havia duas falhas independentes antes de a API ficar pronta:

1. O `Settings` usava o comportamento `extra="forbid"`. A reproducao sobre
   a `main` exata, com as variaveis citadas no incidente, gerou
   `pydantic_core.ValidationError` / `extra_forbidden` para
   `STRIPE_PRICE_PRO_MONTHLY_USD` e `RESEND_API_KEY`.
2. O cliente Gemini era criado durante o import do modulo. Sem chave, o import
   de `app.main` podia falhar antes do FastAPI iniciar.

O worker de notificacoes era um terceiro risco de startup: estava habilitado por
padrao em documentacao/configuracao antiga e dependia de Supabase, DNS e SMTP.

As correcoes adotadas foram:

- declarar todos os nomes realmente consumidos e aceitar aliases legados;
- usar `extra="ignore"` para chaves gerenciadas pela plataforma que o app nao
  consome;
- inicializar integracoes opcionais somente quando chamadas;
- manter `ENABLE_NOTIFICATION_WORKER=false` por padrao;
- capturar/logar falha opcional do worker sem derrubar a API;
- manter `/health` independente de Supabase, Stripe, e-mail, IA e WhatsApp.

Os logs autenticados do Render nao estavam disponiveis. Assim, a causa acima e
comprovada por reproducao local sobre o mesmo SHA e nao por leitura do primeiro
stack trace completo do deploy remoto.

## Estado encontrado e revalidado

### Backend e Render

- A imagem `python:3.11.11-slim-bookworm` constroi e roda como UID 10001.
- `GET /health` local responde rapidamente sem integracoes opcionais.
- O `render.yaml` agora define runtime Docker, branch `main`, contexto e
  Dockerfile do backend, sem secrets.
- O schema oficial do Blueprint aceitou o arquivo.
- O Render CLI nao conseguiu consultar o servico por ausencia de sessao/workspace.
- `https://plafin.onrender.com/health` nao retornou bytes nem em 30 nem em
  120 segundos. O backend remoto continua **INDISPONIVEL**.

### Supabase

- Projeto remoto identificado: `pmzqanfmqzndkrzvvvat`, regiao `sa-east-1`.
- Dez tabelas publicas, todas com RLS habilitado e zero linhas na leitura feita:
  `profiles`, `clients`, `transactions`, `appointments`,
  `ai_conversations`, `whatsapp_messages`, `usage_counters`,
  `notifications_outbox`, `availability` e `stripe_webhook_events`.
- O historico remoto de migrations esta vazio.
- Alertas remotos confirmados: quatro funcoes com `search_path` mutavel,
  funcoes `SECURITY DEFINER` expostas, grants amplos, tres FKs sem indice,
  policies com `auth.*` por linha e protecao contra senha vazada desabilitada.
- Foi criado um baseline local e uma migration de hardening; nada foi aplicado
  no remoto.

### Stripe

- Conta consultada somente em test mode (`livemode=false`).
- Ha dois produtos ativos `Plafin Pro` e tres Prices mensais ativos:
  R$ 74,90, R$ 79,90 e US$ 12,90.
- O webhook de teste aponta para
  `https://plafin.onrender.com/api/stripe/webhook`.
- O codigo aceita apenas o Price configurado em
  `STRIPE_PRICE_PRO_MONTHLY_BRL` e rejeita moeda/Price divergente.
- Nenhum Price foi escolhido, criado, alterado ou arquivado neste ciclo.
- R$ 44,90 nao foi criado nem configurado.

### Vercel

- Projeto `plafin` encontrado.
- O deploy Production esta `READY`, veio da branch `main` no commit
  `d0085c5`.
- `plafin.online` e `www.plafin.online` apontam para Production sem erro de
  alias; `https://plafin.online` respondeu 200.
- O aviso do bundle acima de 500 kB e de performance e nao bloqueia o deploy.

## Estado por frente

| Frente | Estado | Evidencia principal |
|---|---|---|
| Boot FastAPI local | CONCLUIDO | import, Uvicorn, TestClient e Docker verdes |
| Settings/env | CONCLUIDO | teste de extras, aliases e defaults |
| Docker/Blueprint | CONCLUIDO LOCAL | imagem saudavel e schema valido |
| Worker opcional | CONCLUIDO NO CODIGO | default false e falha nao fatal |
| Supabase migrations/RLS | CONCLUIDO LOCAL | reset, pgTAP, lint e diff |
| Frontend build/lint | CONCLUIDO | lint, typecheck e build verdes |
| Stripe SDK/webhook | CONCLUIDO LOCAL | testes de assinatura/idempotencia |
| Vercel remoto | REVALIDADO | Production READY e dominio 200 |
| Render remoto | BLOQUEADO | sem acesso ao painel e endpoint sem resposta |
| Supabase remoto | NAO APLICADO | exige backup, diff e aprovacao |
| Checkout/portal real | BLOQUEADO | backend remoto e Price canonico pendentes |
| E2E de navegador | NAO INICIADO | ambiente integrado ainda indisponivel |

## Limites respeitados

- Nenhum deploy, merge ou push direto em `main`.
- Nenhuma alteracao em Render, Supabase, Stripe, Vercel ou DNS.
- Nenhum secret exibido ou gravado.
- Nenhum dado real criado.
- IA, WhatsApp, e-mail e worker permaneceram desativados.
