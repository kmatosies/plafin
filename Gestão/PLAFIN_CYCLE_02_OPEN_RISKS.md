# Plafin - Ciclo 02 - Riscos e pendencias

## P0 - Bloqueiam disponibilidade

### R-001 - Backend remoto indisponivel

- Estado: **ABERTO**.
- Evidencia: `https://plafin.onrender.com/health` terminou sem bytes em
  tentativas de 30 e 120 segundos.
- Impacto: frontend nao conclui nenhum fluxo que depende da API.
- Acao: aprovar a PR, sincronizar o runtime Docker no Render, preencher envs e
  validar logs/health.

### R-002 - Remoto sem historico de migrations

- Estado: **ABERTO / ALTO RISCO DE DADOS**.
- Evidencia: schema existe, mas a tabela de historico remoto esta vazia.
- Impacto: `db push` cego pode colidir com objetos existentes ou registrar
  estado falso.
- Acao: backup, diff, estrategia de baseline e aprovacao humana antes de escrita.

### R-003 - Price Pro canonico nao decidido

- Estado: **DECISAO HUMANA**.
- Evidencia: Prices mensais ativos de R$ 74,90, R$ 79,90 e US$ 12,90.
- Impacto: checkout nao pode ser configurado sem risco de cobrar/exibir valor
  divergente.
- Acao: escolher um unico Price BRL em test mode. R$ 44,90 continua proibido
  neste ciclo.

## P1 - Bloqueiam aceite funcional

### R-004 - Fluxos integrados ainda nao foram executados

- Estado: **BLOQUEADO PELO AMBIENTE**.
- Faltam cadastro/login/logout/reset por navegador; CRUD de clientes,
  financeiro e agenda; conflito; checkout; portal; webhook entregue pelo Stripe.
- Os testes unitarios, de API e banco local reduzem risco, mas nao substituem E2E.

### R-005 - Cadastro pode deixar usuario Auth sem profile

- Estado: **ABERTO**.
- Cenario: Supabase Auth cria usuario e a insercao posterior de `profiles`
  falha.
- Impacto: conta parcial/orfa.
- Recomendacao: mover criacao de profile para trigger idempotente ou implementar
  reconciliacao/compensacao testada em ciclo posterior.

### R-006 - Recuperacao de senha depende da configuracao Auth

- Estado: **PARCIAL**.
- O contrato do backend foi corrigido, mas URL allowlist, template, entrega de
  e-mail e politica de confirmacao nao foram testados no projeto remoto.

### R-007 - Hardening Supabase existe apenas localmente

- Estado: **ABERTO**.
- No remoto ainda permanecem alerts de `search_path`, grants, execucao de
  funcoes, FKs sem indice e RLS initplan.
- A migration local corrige esses pontos, mas so gera efeito depois do Gate de
  banco.

### R-008 - Descricoes Stripe prometem IA/WhatsApp

- Estado: **ABERTO**.
- Impacto: catalogo pode prometer recursos fora da Fase 1.
- Acao: revisar texto na futura consolidacao do catalogo, sem alterar objetos
  enquanto houver duvida comercial.

## P2 - Operacao e manutencao

### R-009 - Worker ainda nao e um servico separado

- Estado: **ACEITO TEMPORARIAMENTE**.
- O worker fica desligado e nao bloqueia a API. Antes de ativa-lo, criar processo
  separado, fila/retry, idempotencia, health proprio e observabilidade.

### R-010 - Rate limiting e local ao processo

- Estado: **ABERTO**.
- Impacto: limites nao sao globais ao escalar para mais instancias.
- Acao futura: backend compartilhado/Redis ou limite no edge.

### R-011 - Bundle principal acima de 500 kB

- Estado: **ACEITO**.
- O build passa; o warning e de performance.
- Acao futura: dividir rotas/chunks e medir Web Vitals depois da recuperacao.

### R-012 - Deprecacoes de dependencias de teste

- Estado: **MONITORAR**.
- TestClient recomenda migracao futura para httpx 2 e o cliente Supabase emite
  warnings internos de transporte.

### R-013 - Observabilidade insuficiente

- Estado: **ABERTO**.
- Nao ha drain central, alerta de health, metrica de webhook ou correlation ID.
- Acao: adicionar logs estruturados e alertas depois do primeiro deploy estavel.

### R-014 - Branches remotas divergentes

- Estado: **ABERTO SEM ACAO DESTRUTIVA**.
- `master` e `fix/render-production-config` contem historico relevante, mas
  nao devem ser fontes de producao.
- Acao: apos a nova PR e estabilizacao, comparar uma ultima vez e solicitar
  confirmacao antes de fechar/excluir.

## P3 - Melhoria posterior

- Substituir o README generico do frontend por instrucoes especificas.
- Adicionar CI obrigatoria para backend, frontend, pgTAP, audit e secret scan.
- Criar ambiente staging separado de Production.
- Definir SLO de health, erro e latencia.
- Documentar retencao/cleanup de dados sinteticos.
- Rever mensagens de plano e onboarding apos decisao comercial.

## Sequencia recomendada

1. Revisar a nova PR e aprovar explicitamente o plano de migration/rollback.
2. Escolher o Price mensal BRL canonico em test mode.
3. Fazer backup e aplicar/registrar migrations remotas de forma controlada.
4. Converter/sincronizar o Render para Docker e validar `/health` e `/docs`.
5. Validar Preview Vercel e executar o smoke/E2E integrado.
6. Somente apos aceite, mesclar em `main` e promover Production.
7. Tratar os P1 restantes antes de dados reais ou Stripe live.

## Proximo passo unico recomendado

**Fazer a revisao humana da nova PR sem merge, aprovando ou rejeitando a
estrategia de baseline/migration e escolhendo o Price BRL que sera usado nos
testes integrados.**
