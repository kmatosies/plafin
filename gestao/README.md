# Gestão do Plafin

Este diretório centraliza planejamento, decisões, execuções e evidências do projeto.
O código e a configuração executável continuam sendo a fonte técnica principal; estes
documentos registram contexto, decisões e resultados verificados.

## Estado atual

- Fase ativa: **Fase 01 — MVP operacional**
- Ciclo ativo: **Ciclo 02 — estabilização, Docker e hardening**
- Status: **parcialmente concluído**
- Branch: `fix/cycle-02-backend-docker`
- PR: [#4 — recover backend with Docker and Supabase hardening](https://github.com/kmatosies/plafin/pull/4)
- Próximo gate: revisão humana do PR, estratégia de baseline do Supabase e definição do Price BRL de teste

Consulte o [painel de estado atual](01-estado-atual/README.md).

## Execuções

| Data | Fase | Ciclo | Execução | Status | Documentação |
|---|---|---|---|---|---|
| 2026-09-21 | Fase 01 — MVP | Ciclo 02 — Estabilização | 01 | Parcial | [Abrir execução](02-fases/fase-01-mvp/ciclo-02-estabilizacao/2026-09-21-execucao-01/README.md) |

## Organização

- `00-governanca/`: convenções para documentos e agentes.
- `01-estado-atual/`: painel vivo, riscos ativos e decisões pendentes.
- `02-fases/`: histórico imutável das execuções por fase, ciclo e data.
- `03-operacao/`: runbooks reutilizáveis de deploy, migrations e rollback.
- `04-decisoes/`: ADRs para decisões arquiteturais ou comerciais relevantes.

As pastas são escritas em minúsculas e sem acentos para manter compatibilidade
entre Windows, Linux, Git, CI e OneDrive.

## Convenções

Leia [00-governanca/convencoes-documentais.md](00-governanca/convencoes-documentais.md)
antes de criar novos relatórios.
