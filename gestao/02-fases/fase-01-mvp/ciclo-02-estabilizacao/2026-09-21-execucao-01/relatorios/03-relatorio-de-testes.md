# Plafin - Ciclo 02 - Relatorio de testes

Data: 21/09/2026

## Resumo

| Area | Resultado |
|---|---|
| Backend unit/contract | PASS - 22 passed, 1 skipped |
| Backend + Supabase local | PASS - 1 integracao opt-in |
| pgTAP/RLS | PASS - 25 testes |
| Supabase lint/diff | PASS - sem erro e diff vazio |
| Uvicorn/health local | PASS |
| Imagem Docker/health | PASS |
| Frontend lint/typecheck/build | PASS |
| Auditoria Python/NPM | PASS - 0 vulnerabilidades conhecidas |
| Render Blueprint | PASS no schema; CLI remoto bloqueado |
| Vercel/dominio | PASS por leitura e HTTP |
| Render publico | FAIL - timeout, sem resposta |
| Stripe checkout real | BLOCKED |
| E2E browser completo | NOT RUN |

## Reproducao das causas de startup

- Em checkout limpo da `main`, instanciar o Settings com
  `STRIPE_PRICE_PRO_MONTHLY_USD` e `RESEND_API_KEY` reproduziu
  `extra_forbidden`.
- Importar o caminho antigo sem `GEMINI_API_KEY` reproduziu falha de
  inicializacao do cliente antes da API.
- Depois das correcoes, `python -c "from app.main import app"` passou sem
  Gemini, SMTP, Evolution ou worker.

Nenhum valor de ambiente foi impresso.

## Backend

Comandos equivalentes executados a partir de `backend/`:

```powershell
.venv\Scripts\python -m pip check
.venv\Scripts\python -m pytest
$env:RUN_SUPABASE_INTEGRATION='1'
.venv\Scripts\python -m pytest tests/integration/test_supabase_flow.py
```

Resultados:

- suite padrao: 23 coletados, 22 passaram e 1 integracao foi ignorada por
  default;
- integracao opt-in contra Supabase local: 1 passou;
- `pip check`: nenhuma dependencia quebrada;
- import/startup e `GET /health`: passaram;
- rotas privadas sem credencial retornaram 401;
- settings aceitaram aliases legados e ignoraram extras;
- testes cobrem conflito de agenda, planos, uso e webhook Stripe, incluindo
  assinatura invalida, Price divergente e repeticao do evento.

Warnings restantes:

- TestClient de FastAPI/Starlette sinaliza uma futura mudanca para httpx 2;
- cliente Supabase emite deprecacoes internas de `timeout`/`verify`.

Eles nao alteram o resultado atual, mas devem entrar em manutencao futura.

## Supabase local

```powershell
npm run supabase:start
npx supabase db reset
npm run supabase:test
npx supabase db lint --local
npx supabase db diff --local
npm run supabase:stop -- --no-backup
```

Resultados:

- migrations aplicaram em Postgres 17;
- pgTAP: 25/25 passaram;
- isolamento entre dois usuarios validado para clientes, transacoes,
  agendamentos e disponibilidade;
- `anon` sem acesso as tabelas testadas;
- funcoes administrativas sem `EXECUTE` para `anon/authenticated`;
- reserva de evento Stripe validada em primeira tentativa e repeticao;
- indices e constraint de sobreposicao presentes;
- database lint sem erros;
- diff final vazio;
- stack local encerrado ao final.

## Docker e Render

```powershell
docker build -t plafin-backend:cycle02-final backend
docker run --name plafin-cycle02-test -p 8000:8000 plafin-backend:cycle02-final
docker inspect plafin-cycle02-test
```

Resultados:

- build limpo concluido;
- processo executado como usuario nao-root (UID 10001);
- health local respondeu em aproximadamente 317 ms;
- estado do Docker health: `healthy`;
- container encerrado depois do teste;
- `render.yaml` aceito pelo schema oficial do Render;
- Render CLI 2.28.0 nao validou o workspace remoto sem autenticacao.

Teste remoto:

```powershell
curl.exe --max-time 30 https://plafin.onrender.com/health
curl.exe --max-time 120 https://plafin.onrender.com/health
```

Ambos terminaram sem status HTTP e sem bytes. Portanto, o criterio remoto do
ciclo ainda falha.

## Frontend

```powershell
npm run lint --prefix frontend
npx --prefix frontend tsc -b
npx --prefix frontend vite build --configLoader runner
npm audit --prefix frontend
```

Resultados:

- ESLint: PASS;
- TypeScript: PASS;
- Vite: PASS;
- bundle principal aproximado: 511,83 kB, com warning nao bloqueante;
- auditoria do frontend: 0 vulnerabilidades;
- auditoria do lockfile raiz: 0 vulnerabilidades.

O script combinado `npm run build` encontrou `EPERM spawn` no sandbox e uma
execucao escalada travou em esbuild/OneDrive. O mesmo typecheck e build,
executados separadamente com o loader runner, passaram. O processo orfao foi
encerrado.

## Seguranca de dependencias

```powershell
pip-audit -r backend/requirements.txt
npm audit
npm audit --prefix frontend
```

O primeiro inventario encontrou 125 ocorrencias em nove pacotes, incluindo
dependencias duplicadas/obsoletas. Depois da reducao e atualizacao da arvore:

- `pip-audit`: nenhuma vulnerabilidade conhecida;
- ambos os `npm audit`: 0 vulnerabilidades.

Validacao final do conteudo staged:

```powershell
git diff --cached --check
git diff --cached --binary |
  docker run --rm -i ghcr.io/gitleaks/gitleaks:v8.30.1 stdin --redact
```

- `git diff --cached --check`: PASS;
- Gitleaks 8.30.1: PASS, aproximadamente 303 kB analisados, nenhum leak.

O primeiro scan apontou um placeholder de teste que imitava o prefixo de chave
Stripe. O placeholder foi renomeado para um valor neutro e o diff completo foi
escaneado novamente.

## Servicos externos somente leitura

- Vercel: Production `READY`, branch `main`, commit `d0085c5`, aliases sem
  erro e `https://plafin.online` respondeu 200.
- Stripe: test mode confirmado; inventario de tres Prices ativos concluido;
  nenhum objeto alterado.
- Supabase: projeto saudavel, tabelas/RLS/advisors lidos; nenhuma migration
  aplicada.
- GitHub: refs, PR #3 e divergencias de branches revalidados.

## Nao executado ou bloqueado

- logs autenticados do ultimo deploy do Render;
- deploy Docker remoto;
- aplicacao das migrations remotas;
- Checkout Session e Customer Portal contra Stripe real de teste;
- entrega/reenvio real do webhook pelo Stripe;
- cadastro, recuperacao de senha e logout por navegador;
- CRUD completo por navegador;
- smoke integrado frontend -> Render -> Supabase;
- teste de e-mail, Gemini, Evolution ou worker, deliberadamente fora do ciclo.

Esses itens nao sao considerados aprovados por inferencia.
