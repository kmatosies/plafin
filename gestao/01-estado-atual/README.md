# Estado atual do Plafin

Última revisão: 2026-09-22

## Resumo

O Ciclo 02 está **parcialmente concluído**. O backend, Docker, frontend, migrations e
testes foram validados localmente na branch `fix/cycle-02-backend-docker`. O PR #4
está aberto, em draft e mergeável. Nenhuma mudança foi aplicada ao Render ou ao
Supabase remoto.

## Concluído localmente

- boot do FastAPI sem integrações opcionais;
- imagem Docker não-root e health check local;
- 22 testes de backend, uma integração opt-in e 25 testes pgTAP/RLS;
- frontend lint, typecheck e build;
- hardening Supabase preparado em migrations;
- Stripe preparado para Price BRL único em test mode;
- Vercel Production e domínio público revalidados por leitura.

## Bloqueios atuais

1. Backend remoto do Render continua indisponível.
2. Baseline e migration do Supabase ainda não foram aplicados remotamente.
3. Price Pro mensal BRL de teste ainda não foi escolhido.
4. Checkout, Portal, webhook real de teste e E2E ainda não foram executados.
5. Cadastro pode deixar usuário Auth sem profile se a segunda operação falhar.

## Próxima decisão recomendada

Revisar o PR #4 sem merge, escolher a estratégia segura do baseline Supabase e
definir qual Price BRL será usado somente nos testes integrados. Depois disso,
executar um ciclo remoto controlado para migrations, Render Docker e E2E.

## Referência histórica

[Execução 2026-09-21 — Ciclo 02](../02-fases/fase-01-mvp/ciclo-02-estabilizacao/2026-09-21-execucao-01/README.md)
