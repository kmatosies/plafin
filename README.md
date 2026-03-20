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

- Em evolucao, com foco em consolidar uma experiencia fluida entre frontend, backend e automacoes.

## O que e o Plafin

O Plafin e uma plataforma para profissionais e pequenos negocios que precisam organizar agenda, clientes e financeiro em um unico lugar. A proposta e reduzir operacao manual e transformar dados do dia a dia em decisao rapida.

## Como o sistema funciona

1. O usuario registra clientes, compromissos e movimentacoes financeiras.
2. O dashboard consolida indicadores principais para acompanhamento diario.
3. A camada de IA ajuda na leitura de fluxo de caixa e sugere acoes praticas.
4. O modulo de assinaturas permite evoluir planos conforme o crescimento do negocio.

## Para que serve

- controlar entradas, saidas e visao financeira do negocio
- centralizar a agenda de atendimentos e tarefas
- manter base de clientes organizada com historico
- apoiar decisoes com insights automatizados

## Para quem foi pensado

- autonomos e prestadores de servico
- consultorios e operacoes com agenda recorrente
- pequenas empresas que querem previsibilidade financeira

## Proposta de valor

Menos planilhas soltas, menos retrabalho e mais clareza sobre o que realmente move o faturamento. O Plafin foi desenhado para ser simples na operacao e estrategico no resultado.
