# Convenções documentais

## Estrutura de uma execução

Cada execução deve usar o caminho:

```text
gestao/02-fases/<fase>/<ciclo>/<AAAA-MM-DD>-execucao-<NN>/
```

Dentro da execução:

```text
README.md
prompts/
relatorios/
evidencias/
```

Crie nova pasta quando um agente executar novamente o ciclo, mesmo no mesmo dia.
Nunca sobrescreva uma execução histórica encerrada; correções posteriores devem usar
um adendo ou uma nova execução.

## Ordem dos relatórios

1. `01-baseline-e-causa-raiz.md`
2. `02-mudancas-aplicadas.md`
3. `03-relatorio-de-testes.md`
4. `04-riscos-e-pendencias.md`
5. `05-acoes-manuais.md`

O nome do projeto, fase, ciclo e data não precisa ser repetido no arquivo porque já
está representado pelo caminho.

## Metadados mínimos

O `README.md` de cada execução deve informar:

- objetivo e escopo;
- status real: concluído, parcial, bloqueado ou cancelado;
- data e fuso horário;
- branch, base commit, head commit e PR;
- ambientes lidos e ambientes alterados;
- decisões pendentes;
- links para prompts, relatórios e evidências.

## Regras para agentes

1. Diferenciar testes locais, leituras remotas e alterações remotas.
2. Não declarar sucesso por inferência ou somente por build.
3. Registrar `PASS`, `FAIL`, `BLOCKED` e `NOT RUN` separadamente.
4. Não incluir secrets, tokens, cookies, `.env`, dumps, dados pessoais ou logs brutos.
5. Versionar somente Markdown sanitizado e evidências pequenas.
6. Usar datas ISO, nomes em minúsculas, sem espaços e sem acentos.
7. Preservar IDs de riscos e registrar responsável, prazo e próxima revisão no painel vivo.
8. Transformar decisões relevantes em ADRs dentro de `04-decisoes/`.
9. Promover procedimentos reutilizáveis para `03-operacao/`; relatórios históricos não são runbooks.
10. Marcar material gerado por agente como pendente de revisão humana até sua aprovação.
11. Atualizar este índice e o painel de estado atual ao concluir cada execução.

## Fonte de verdade

- Código, migrations, configuração e CI: fonte técnica executável.
- Relatórios de execução: evidência histórica e contexto.
- `01-estado-atual/`: situação vigente do projeto.
- ADRs: decisões aprovadas e suas consequências.
- Runbooks: procedimentos operacionais reutilizáveis.
