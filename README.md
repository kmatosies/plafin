# Plafin

**Sistema SaaS em desenvolvimento para gestão financeira, agenda operacional e inteligência de negócio para profissionais autônomos e pequenas operações de serviço.**

> Status: projeto ativo em evolução (build in public), com funcionalidades reais já implementadas e foco em robustez técnica para produção.

## Visão do produto

O **Plafin** centraliza três frentes que normalmente ficam espalhadas em planilhas e ferramentas isoladas:

1. **Financeiro** (entradas, saídas, métricas e acompanhamento)
2. **Agenda** (compromissos e rotina de atendimento)
3. **Relacionamento com clientes** (cadastros e histórico)

A proposta é reduzir retrabalho operacional e dar contexto para decisões com base em dados do dia a dia.

## Problema que resolve

Pequenos negócios e profissionais de serviço frequentemente operam com:

- controles financeiros descentralizados
- agenda sem integração com contexto financeiro
- baixa visibilidade de desempenho mensal
- pouca previsibilidade para tomada de decisão

O Plafin busca resolver isso com uma aplicação única, organizada por fluxos de rotina e preparada para escalar recursos por plano.

## Público-alvo

- profissionais autônomos
- prestadores de serviço com agenda recorrente
- micro e pequenas operações que precisam de visibilidade financeira e operacional

## Funcionalidades atuais

- autenticação e sessão de usuário
- dashboard com indicadores principais
- gestão de clientes
- gestão de transações financeiras
- gestão de agendamentos
- controle de planos e recursos por assinatura
- integração de pagamentos com Stripe (checkout/portal)
- camada de IA para apoio financeiro (em evolução)
- base para automações de notificações e WhatsApp (em evolução)

## Arquitetura (visão geral)

### Frontend

- **React + TypeScript + Vite**
- cliente HTTP centralizado
- contexto de autenticação
- proteção de rotas
- páginas por domínio (dashboard, clientes, financeiro, agenda, assinatura)

### Backend

- **FastAPI** (API REST)
- roteadores por domínio (`auth`, `dashboard`, `transactions`, `clients`, `appointments`, `subscriptions`, `ai`, `availability`)
- serviços de integração (Supabase, Stripe, IA, notificações)
- middlewares (auth/acesso)
- rate limit com SlowAPI

### Dados e integrações

- **Supabase**: Auth + PostgreSQL
- **Stripe**: billing, checkout e portal de assinatura
- **Google Gemini**: recursos de IA financeira
- **Evolution API**: canal de automação WhatsApp (opcional)

## Stack resumida

- **Frontend:** React, TypeScript, Vite
- **Backend:** Python, FastAPI, Pydantic
- **Banco/Auth:** Supabase
- **Pagamentos:** Stripe
- **IA:** Gemini
- **Deploy:** Vercel (frontend) + Render (backend)

## Deploy (visão prática)

- `vercel.json`: build do frontend via raiz do monorepo
- `render.yaml`: serviço web Python para API
- variáveis sensíveis configuradas apenas em ambiente (não versionadas)

Documentação de deploy: `docs/deploy.md`.

## Status atual do projeto

O projeto está em **fase ativa de desenvolvimento**, com base funcional e arquitetura modular já estabelecidas. No momento, o foco está em:

- fortalecimento de confiabilidade e observabilidade
- evolução de fluxos pagos e webhooks
- maturidade de segurança e prontidão para exposição pública

## Desafios técnicos em andamento

- consistência entre regras de plano no frontend e backend
- robustez de webhooks de assinatura em cenários de falha/reprocessamento
- endurecimento de autenticação/autorização por feature
- evolução de workers assíncronos de notificação
- melhoria de DX para setup local e contribuição

## Roadmap (próximos passos)

- [ ] ampliar suíte de testes automatizados (backend + frontend)
- [ ] adicionar observabilidade centralizada (logs estruturados e alertas)
- [ ] consolidar onboarding e demo data para avaliação rápida
- [ ] melhorar documentação de arquitetura e decisões técnicas
- [ ] hardening de segurança para lançamento público contínuo

## Contribuição

Veja o guia em [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

## Autor

Desenvolvido por **Kevin Matos**.
