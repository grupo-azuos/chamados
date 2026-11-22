---
name: dashboard-standard
description: O DASHBOARD PADRÃO do Grupo Azuos — painéis Equipe, Gestor e Pessoal, canvas de blocos, gráficos, filtros do painel e filtros salvos. O motor é igual em todo sistema e só o SUPORTE mexe; cada projeto muda só as FONTES DE DADOS e o painel padrão. Use SEMPRE que a pessoa pedir algo sobre dashboard, painel, gráfico, bloco, indicador, "mostrar no dashboard", "um gráfico de", fonte de dados, filtro do painel, ou quiser mudar a forma de um gráfico.
---

# Dashboard padrão

Todo sistema do grupo tem a tela **Dashboard**, primeira no menu, igual em todos. A checagem de
arquitetura (regra `standard-screens`) reprova o sistema que não tiver a tela, o módulo da API
ou a entrada no menu.

## O que é do projeto (livre)

Só **dados**. Três arquivos, e nada mais:

| Arquivo | O que tem |
|---|---|
| `shared/src/schemas/dashboard-sources.ts` | As fontes: nome, campos (com rótulo de cada opção), agrupamentos, e os filtros de campo do painel. |
| `server/src/modules/dashboard-boards/repository/widget-sources.ts` | A mesma fonte no banco: qual coluna é cada campo, o dia de cada registro, o campo de pessoa. **Mesmas chaves** do arquivo acima. |
| `server/src/modules/dashboard-boards/service/default-boards.ts` | O painel que aparece enquanto ninguém montou o seu. |

### Fonte nova, passo a passo

1. Acrescente a fonte em `dashboard-sources.ts` (campos e agrupamentos).
2. Acrescente a mesma chave em `widget-sources.ts`, apontando para as colunas. Data vira dia de
   Brasília com `brasiliaDay(...)`; campo de pessoa diz o que a coluna guarda (`id`, `email` ou
   `name`) — o filtro salvo guarda o id e o motor faz a ponte.
3. Se quiser, ponha um bloco dela no `default-boards.ts`.
4. Teste com banco de verdade em memória (`dashboard-boards.repository.test.ts` é o molde).

Pronto: a tela, o editor de bloco, o construtor de filtro e os filtros do painel passam a
oferecê-la sozinhos.

## O que é do suporte (travado)

O **motor** é estritamente do suporte — nem outro administrador mexe em gráfico. A lista
`scripts/git/protected-structure.txt` (seção "DASHBOARD PADRÃO") trava, no Claude e no git:

- o contrato do motor (`dashboard-board.schema.ts`, `dashboard-source.types.ts`);
- a tabela, o controller, o service, o repositório e a tradução de filtro em SQL;
- a tela inteira (`routes/dashboard/`), os view-models e a API do dashboard;
- **todos os gráficos** (`azuos-*-chart`, `azuos-echart`, legendas) e seus utilitários.

Pedido para mudar a forma de um gráfico, criar um tipo de bloco ou mexer no canvas → não faça e
não contorne: encaminhe ao suporte (skill `support`).

## Regras que o motor já garante

- Nada de SQL com texto vindo da tela: campo fora do mapa da fonte é recusado (422).
- O filtro "Pessoa" e os filtros salvos guardam o **id** da pessoa (skill `select-standard`).
- Os blocos se releem sozinhos quando algo é gravado: toda escrita entra no histórico, e o
  histórico avisa o dashboard.
- Arquivar, nunca apagar: filtro salvo arquiva e desarquiva.
