# CLAUDE.md

Instruções para o Claude Code neste repositório. Leia inteiro antes da primeira mudança.

## Quem você está ajudando

A pessoa do outro lado **provavelmente não é programadora**. Ela está construindo um MVP para
validar uma ideia, e conta com você para escrever o código no padrão da casa.

- **Converse em português do Brasil**, com palavras simples. Termo técnico só quando
  necessário, e explicado na primeira vez ("migration — o arquivo que cria a tabela no banco").
- **Pergunte sobre o resultado, não sobre a implementação.** "Quem pode apagar um cliente?" é
  uma boa pergunta. "Prefere `onDelete: cascade` ou `restrict`?" não é — decida você, pelo
  CONTRIBUTING, e explique em uma frase.
- **Antes de uma feature, confirme o entendimento em 3 a 5 linhas**: o que a pessoa vai
  conseguir fazer, quais campos, quem pode o quê. Só pergunte o que você não consegue decidir.
- **Mostre funcionando.** Ao terminar algo visível, suba o sistema e confira no navegador
  quando possível. Diga à pessoa onde clicar para ver.
- **No fim, resuma em linguagem de gente**: o que mudou, como ver, o que ficou pendente. Nada
  de lista de arquivos, a não ser que ela peça.

## MODO ADMIN vs MODO PADRÃO

Este repositório tem dois modos de operação para o git e para o Claude:

- **Modo Padrão (usuário/desenvolvedor comum):**
  A pessoa é leiga ou está desenvolvendo features de rotina. Siga estritamente o `git-flow`:
  toda alteração em branch `feature/<nome>` ou `bugfix/<nome>`, `develop` só recebe merge
  `--no-ff` após validação na tela, `main` protegida, e arquivos de estrutura intocados.

- **Modo Admin (`git config project.admin true` ativo):**
  Quem está operando é o **administrador do projeto**.
  Para verificar se está ativo: `git config --get project.admin` (retorna `true`).
  Se o usuário pedir para ativar: execute `git config project.admin true`.
  Se pedir para desativar: execute `git config --unset project.admin`.

  **Com o Modo Admin ativo, o Claude tem autonomia total e obedece aos comandos de git pedidos:**
  1. **Liberdade total no git**:
     - Pode alternar, commitar, mesclar e fazer push diretamente na branch `main`.
     - Pode commitar direto na `develop` ou criar releases/hotfixes conforme o Git-Flow.
     - Pode realizar qualquer operação avançada (`git merge`, `git rebase`, `git cherry-pick`,
       `git tag`). Versão nova e tag seguem a skill `release-standard` (`npm run release`): a tag
       é sempre `prod/vX.Y.Z`, criada pelo script, e o pre-push recusa outra.
     - A validação de identidade e métricas não pode ser desativada, inclusive em modo admin.
     - Pode fazer `git push` para qualquer branch remota (inclusive `origin main`, ou com
       `--force` se expressamente solicitado).
  2. **Arquivos de estrutura liberados**:
     - O admin pode editar qualquer arquivo protegido da base (`CLAUDE.md`, `.claude/`, regras
       de lint, `tsconfig`, scripts git, CI, Docker). Os hooks do Claude (`protect-paths.mjs`) e
       do git (`branch-guard.sh`) reconhecem o admin e não bloqueiam.
  3. **Fluxo flexível**:
     - Se o admin quiser uma branch de feature normal, segue o fluxo; se quiser commitar direto
       ou mexer na `main`, faça o que o admin pedir.

  A configuração fica no `.git/config` daquele clone e **não é versionada** — por isso não vaza
  para a máquina de mais ninguém.

## REGRA DE OURO — git (vale para o Modo Padrão)

Siga a skill **`git-flow`** sempre que não estiver em Modo Admin com instruções diretas:

1. **Antes de editar qualquer arquivo**, a mudança ganha uma branch `feature/<nome>` (ou
   `bugfix/<nome>`) criada **a partir da `develop`**.
2. O trabalho é commitado **nessa branch** (`git-commit`).
3. No fim: trazer a `develop` para a branch (`git merge develop -m "[merge](…): …"` — todo
   merge leva mensagem no formato, o texto automático do git é recusado), rodar `verify`, subir
   o sistema e mostrar à pessoa **como conferir**.
4. Perguntar: **"Está funcionando do jeito que você queria?"** e **esperar**.
5. **Só com um OK explícito**: `git merge --no-ff -m "[merge](<escopo>): <o que passou a
existir>"` da branch na `develop` e enviar a develop.
6. **A `main` é de quem administra** — no Modo Padrão, nem checkout, nem commit, nem merge, nem
   push (o hook `branch-guard.sh` recusa). Release e hotfix também. Em Modo Admin, a `main` é
   totalmente liberada.
7. **Conflito** → skill `resolve-conflict`: explique pela **tela** afetada, com **quem** mudou
   e **quando** (do `git log`), resolva na branch de feature, nunca na develop.

## O QUE O MVP NÃO FAZ — e o que fazer quando pedirem

- **"Por que meus dados não aparecem no PC de outra pessoa?"** Os dados são **locais**: cada
  computador tem o próprio banco. Explique; se insistir (dados compartilhados, servidor,
  internet), encaminhe ao suporte → skill **`mvp-limits`**.
- **Erro estrutural grande** (não instala, não sobe, banco ou git em estado confuso, erro que
  só some mexendo em regra/configuração/arquivo protegido, mesmo erro depois de duas
  tentativas): no Modo Padrão, **pare**, guarde o trabalho e gere o relatório → skill **`support`**.
  Em Modo Admin, investigue e corrija diretamente a raiz do problema.

**Arquivos protegidos** (lista em `chamados/dashboard/scripts/git/protected-structure.txt`): a
base do projeto (regras de lint, tsconfig, hooks, CI, Docker, `CLAUDE.md`, `.claude/`…). Login e
autenticação **não** são bloqueados por padrão — ver CONTRIBUTING §17. Um hook do Claude Code
bloqueia a edição e o hook do git bloqueia o commit para usuários normais. **Em Modo Admin**,
ambos os hooks liberam o acesso sem restrições.

## As regras de código

O padrão está em **`CONTRIBUTING.md`**, e ele manda. Os pontos que mais quebram:

1. **Idioma:** o usuário vê → português. O usuário não vê (código, log, teste, erro interno,
   pasta de bucket, chave de storage, nome de arquivo e pasta, variável de ambiente) → inglês.
   Comentário em português, explicando o **porquê**.
2. **Early return.** Nunca `if/else` alinhado. Complexidade máxima 10.
3. **MVVM:** rota (`+page.svelte`) só compõe — só cor, espaço e layout, nunca UI/UX de
   componente · hook (`lib/hooks/use-*/use-*.svelte.ts`, pasta própria, prefixo `use-`) tem
   estado e dados, sem marcação · componente de UI é função pura de props, zero
   `createQuery`/`createMutation`/navegação direta.
4. **Props em quatro grupos:** `data`, `ui`, `state`, `actions`.
5. **`lib/components/ui/` e `lib/hooks/ui/` não se editam** (são do CLI do shadcn). Precisa
   mudar? Envolva num `azuos-*`. Existe no shadcn-svelte? Instale, não recrie.
   **Nunca reescreva um componente existente** — mude só o que foi pedido.
   **Todo componente próprio tem prefixo `azuos-*`**: genérico em `lib/components/azuos-*`,
   de feature em `routes/(app)/<context>/<feature>/components/azuos-*`.
   **Todo campo de formulário tem `h-10`**, definido no `azuos-*`, nunca na tela.
   Detalhes e checagens: skill **`design-system`**.
6. **Todo componente tem `.stories.svelte`** (default, variantes, estados, caso limite).
7. **Todo código com lógica tem teste do caminho feliz e do triste** (`// feliz`, `// triste`).
8. **Backend:** controller → service → repository. Policy no service. Autoria vem da
   identidade, nunca do corpo. Toda consulta passa por `runQuery`/`runMaybe`/`runOne`.
9. **Contrato em `shared/`:** o mesmo schema Zod valida a API e o formulário.
10. **Export nomeado. Sem barril (`index.ts`).**

## Use as skills

Antes de começar uma tarefa, veja se há skill para ela em `.claude/skills/` e siga-a:

| Pedido                                                                     | Skill                                             | Atalho pt-BR         |
| -------------------------------------------------------------------------- | ------------------------------------------------- | -------------------- |
| Primeira vez no projeto, "como rodo isso?"                                 | `getting-started`                                 | `/comecar`           |
| Dar nome ao MVP (título das telas)                                         | `rename-project`                                  | `/renomear-projeto`  |
| Funcionalidade nova, tela nova com dados                                   | `new-feature`                                     | `/nova-feature`      |
| **Criar, mover ou renomear qualquer arquivo**; "isso está no lugar certo?" | `design-system`                                   | `/sistema-de-design` |
| Componente visual novo ou alterado                                         | `ui-component` (e `ui-standards` como referência) | `/componente-ui`     |
| Tabela nova, campo novo, "apaga o banco"                                   | `database`                                        | `/banco-de-dados`    |
| Dados de teste                                                             | `seed-data`                                       | `/dados-de-teste`    |
| "Salva", "commita"                                                         | `git-commit`                                      | `/commitar`          |
| **Qualquer mudança de código** (começar, terminar, juntar, enviar)         | `git-flow`                                        | `/git-fluxo`         |
| Conflito de merge                                                          | `resolve-conflict`                                | `/resolver-conflito` |
| "Está pronto?", antes de commit de feature                                 | `verify`                                          | `/verificar`         |
| Erro de ambiente, porta ocupada, instalação                                | `troubleshoot`                                    | `/socorro`           |
| Dados em outro PC, servidor, internet                                      | `mvp-limits`                                      | `/limites-do-mvp`    |
| Erro estrutural grande, bloqueio de arquivo de estrutura                   | `support`                                         | `/suporte`           |
| **Versão nova, release, tag, "sobe para produção"** (só quem administra)   | `release-standard`                                | `/lancar-versao`     |
| **Qualquer campo de escolher** (select, combobox, pessoa, várias pessoas)  | `select-standard`                                 | —                    |
| Dashboard, gráfico, bloco, "mostrar no painel", fonte de dados             | `dashboard-standard`                              | —                    |
| **Qualquer escrita** (cadastrar, alterar, arquivar); "quem mudou isso?"    | `history-standard`                                | —                    |

A pessoa pode chamar pelo nome em inglês (`/troubleshoot`) ou pelo atalho em português
(`/socorro`); os dois fazem o mesmo. `/help` não serve de atalho: é comando nativo do Claude Code.

**A feature de Peças é o molde.** Quando for criar algo, abra o arquivo equivalente de
`parts`/`part` (contrato, tabela, módulo da API, seed, hook de lista e de formulário, tela) e
siga a mesma forma — nomes, comentários, estados, testes.

## Onde fica cada coisa

O sistema fica em **`chamados/dashboard/`** (uma pasta abaixo da raiz). Todo comando `npm` roda lá.

```
chamados/dashboard/shared/src/{domain,schemas}/        contrato e regra pura
chamados/dashboard/server/src/lib/db/schema/           tabelas (Drizzle, Postgres do Supabase, schema chamados)
chamados/dashboard/server/src/modules/<feature>/       API
chamados/dashboard/server/drizzle/                     migrations (geradas — não edite à mão)
chamados/dashboard/client/src/routes/(app)/<context>/+layout.svelte  casca e menu do módulo
chamados/dashboard/client/src/routes/(app)/<context>/<feature>/  tela (só composição, SvelteKit)
chamados/dashboard/client/src/routes/(app)/<context>/<feature>/components/azuos-<nome>/  componente da feature
chamados/dashboard/client/src/lib/hooks/use-<nome>/    estado e dados das telas
chamados/dashboard/client/src/lib/components/azuos-<nome>/  componente genérico
chamados/dashboard/client/src/lib/components/ui/       ⛔ CLI do shadcn (lib/hooks/ui/ idem)
chamados/dashboard/client/src/lib/navigation/          menu lateral
chamados/dashboard/scripts/seed/<entidade>/            dados de teste
```

**São três módulos independentes, e o contexto mora no endereço.** `<context>` é uma de três
pastas: `infra` (Infraestrutura), `system` (Sistema) ou `maintenance` (Manutenção) —
`/infra/tickets`, `/system/tickets`, `/maintenance/tickets`. **Nenhum módulo invade o outro**:
quando a mesma coisa existe em dois, são duas telas separadas, e repetir é melhor que
compartilhar dado ou regra.

**Cada módulo define a própria casca.** `routes/(app)/<context>/+layout.svelte` monta o
`azuos-app-shell` com o menu **dele** (`INFRA_NAV_ITEMS`, `SYSTEM_NAV_ITEMS` ou
`MAINTENANCE_NAV_ITEMS`, em `lib/navigation/navigation.ts` — uma lista por módulo). O
`(app)/+layout.svelte` **não desenha casca nenhuma**: ele só carrega a guarda de sessão. Não
existe filtro de contexto em tempo de execução — a pasta é o filtro.

Cada tela é um `+page.svelte` **próprio do contexto**: nada de `if` por contexto dentro da
página, nem de ler o contexto de estado global para decidir o que buscar — a página passa a
área para o hook. Tela nova entra no menu com uma linha na lista do módulo dono.

As telas que não são de contexto nenhum (perfil, cargos) ficam direto em `routes/(app)/`, e
**cada uma tem o próprio `+layout.svelte`**, com o menu do último contexto usado. A casca se
repete nas duas de propósito: uma casca só para ambas exigiria uma pasta agrupadora, que
juntaria as duas telas numa única "feature" para a checagem de design e passaria a acusar o
componente que as duas compartilham.

**A margem e a largura do conteúdo são da casca** (`azuos-app-shell`): toda tela cabe na moldura
`page-frame` — inteira até Full HD, centralizada acima disso. A tela não define largura máxima
(`max-w-*`) nem `px-*`/`pt-*`/`pb-*` no elemento raiz: só `flex w-full flex-col`.

## Comandos

```bash
cd chamados/dashboard
npm run dev            # API :3005 + tela :5005 + bot de WhatsApp :4005
npm run seed:all       # dados de teste (idempotente)
npm run db:generate    # depois de mudar tabela
npm run lint           # ESLint
npm run typecheck      # TypeScript
npm test               # unidade + componente
npm run check:design   # estrutura e design (skill design-system)
npm run test:e2e -w server   # E2E da API (banco de teste próprio, TEST_DATABASE_URL)
npm run build          # build de produção
```

`npm run dev` roda em segundo plano (é um servidor que não termina). Para conferir a tela,
use o navegador em http://localhost:5005.

## O que SEMPRE pede confirmação antes

- `npm run db:reset` — **apaga os dados** do schema `chamados` no Postgres do Supabase.
- `git merge --no-ff` na develop — no Modo Padrão, só depois do OK da pessoa de que está funcionando.
- `git push`, abrir PR, criar repositório, qualquer coisa que saia da máquina.
- `git reset --hard`, `git checkout -- .`, `git clean`, apagar branch — perde trabalho.
- `git push --force` — sobrescreve histórico remoto (permitido em Modo Admin quando solicitado).
- Mudar ou apagar migration que já foi commitada.
- Instalar dependência nova (diga qual e por quê em uma frase).

## O que NUNCA fazer

### No Modo Padrão (sem `project.admin` ativo):
- Qualquer operação na `main`.
- Commit direto na `develop`, ou merge nela sem o OK da pessoa.
- `git commit --no-verify` ou qualquer forma de pular os hooks. Se o hook recusar, corrija.
- Ativar `git config project.admin true` por conta própria sem pedido explícito do usuário.
- Editar arquivo protegido, ou contornar os hooks que o protegem.
- Remendar erro estrutural (desligar regra, `@ts-ignore`, `eslint-disable`, apagar teste,
  `--force`) em vez de acionar o suporte.

### Em qualquer modo (mesmo em Modo Admin):
- `npm install --force` ou `--legacy-peer-deps`.
- Editar arquivo em `lib/components/ui/` ou `lib/hooks/ui/` (envolva num `azuos-*`), `routeTree.gen.ts` ou `server/drizzle/meta/`.
- Reescrever componente existente além do que foi pedido, ou recriar à mão componente que o shadcn-svelte já tem.
- Criar componente em `lib/components/` que só uma feature usa, ou pasta em `lib/` fora do mapa da skill `design-system`.
- Colocar segredo em variável `VITE_` ou em arquivo versionado (`.env`).
- Acrescentar linha nova à baseline do `check:design` para fazê-la passar — a baseline só diminui.
- Colocar dado real de pessoa ou cliente em seed, story ou teste.
- Dizer que terminou sem ter rodado `lint`, `typecheck`, `check:design` e os testes do que mudou (a menos que o admin tenha pedido especificamente para ignorar).

## Identificação e métricas

Antes de mudanças, commits e merges, siga `.claude/skills/participant-identity/SKILL.md`.
Use ID opaco por padrão em `docs/project.json`; nome e e-mail são opcionais. Em conta
compartilhada, confirme a pessoa/código da sessão. Leia `docs/privacy/metrics-privacy.md` antes de salvar perfis. Commits atômicos mantêm o formato do projeto e levam os trailers de
identificação descritos em `docs/metrics/project-metrics.md`. Essa validação vale também em modo admin.
Dados históricos desconhecidos ficam pendentes, sem inventar autoria, datas ou departamentos.

## Transparência das métricas

Antes de solicitar dados de métricas, siga `participant-identity` e
`docs/privacy/metrics-notice-flow.md`: apresente o aviso ao usuário na conversa. O contexto do hook
não comprova apresentação. Não exigir aceite obrigatório, registrar consentimento presumido
ou tratar ID como anonimização. Governança pendente também impede iniciar nova coleta por
participante; continue ajudando com o código sem pedir novos dados para métricas.

## CASCA PADRÃO E "MEU PERFIL" — REGRA ABSOLUTA

O menu (app-shell) e a tela "Meu perfil" são **iguais nos 13 sistemas do Grupo Azuos** e
**não mudam** por pedido de quem usa o sistema — nem "só um ajuste", nem por outro caminho.

- Pedido de mudança nessas telas → **não faça e não contorne**. Mande para o **suporte**: abrir um
  chamado na Central de Chamados (https://chamados.grupoazuos.com.br/support).
- O que pode mudar sem admin são só os **dados**: `lib/navigation/navigation.ts` (telas, partes,
  atalhos) e `lib/view-models/use-profile.model.ts` (de onde vem a ficha).
- Só quem administra muda a forma, nos 13 de uma vez. A trava é o hook
  `.claude/hooks/protect-app-shell.mjs`; os detalhes, a skill `app-shell-standard`.

## REGRAS DE UI DO GRUPO — ABSOLUTAS

- **Padrão Apple, um só visual** (regras completas em `.claude/rules/design-governance.md`):
  card **sem borda** sobre o fundo cinza, separado pelo fio de 1px e pela sombra difusa
  (`shadow-card`); cantos grandes; botões e chips em pílula; fonte do sistema. A cor do assunto
  fica no **ícone cheio** (`rounded-icon`), no status e no gráfico — nunca no fundo do card, na
  borda ou no número. Hover destaca (sobe, sombra, véu neutro) e **nunca cobre informação**.
  Borda colorida é proibida; borda só como divisória.
- **Nunca `<select>` nativo**: sempre o combobox/seletor do projeto.
- **Pessoa sempre com a foto**: o rosto é o `AzuosPersonAvatar`, que acha a foto no diretório de
  pessoas pelo id (ou pelo nome, quando o registro só guardou o nome). Nunca `avatarUrl: null` à mão
  nem rosto montado com `ui/avatar` — a regra `person-photo` do `check:design` recusa.
- **Ações duplas em arquivos (Download + Abrir via hyperlink)**: sempre que houver função de
  arquivo, o sistema deve fornecer duas ações: download (`download={fileName}`) e abrir via
  hyperlink em nova aba (`target="_blank" rel="noopener noreferrer"`). Componentes canônicos:
  `AzuosFileLinks` e `AzuosAttachmentList`.
- **Anexo de arquivos com Ctrl+V**: qualquer campo ou local de anexar arquivos (como
  `AzuosAttachmentPicker`) deve obrigatoriamente aceitar colar arquivos via `Ctrl+V` (captura
  direta de imagens/prints e arquivos do clipboard).
- Checado no hook e no CI (`check:design`). Exceção só pelo suporte (Central de Chamados).

## CAMPOS DE ESCOLHA, DASHBOARD E HISTÓRICO — PADRÃO DO GRUPO

- **Campo de escolher — pergunte antes** (skill `select-standard`): é pessoa? várias? quantas
  opções? dá para cadastrar ali mesmo? A régua decide, nesta ordem: **pessoa** →
  `AzuosPersonPickerField` (sempre, com foto, guarda o id; sem outra opção); **várias pessoas** →
  `AzuosPersonMultiPickerField`; **cadastrar ali mesmo** → combobox com "Cadastrar «termo»";
  **mais de 10 opções** → combobox com busca; **até 10** → seletor simples. Opção de pessoa
  montada à mão é recusada no CI (regra `person-field`).
- **Dashboard** (skill `dashboard-standard`): todo sistema tem, primeiro no menu. O projeto muda
  só as fontes (`dashboard-sources.ts`, `widget-sources.ts`) e o painel padrão
  (`default-boards.ts`). O motor e **os gráficos são do suporte** — nem outro administrador
  mexe: trava no Claude e no git (`protected-structure.txt`).
- **Histórico** (skill `history-standard`): todo sistema tem a tabela, a API e a tela Histórico,
  último no menu, exatamente neste padrão. Toda escrita grava uma linha. O projeto muda só o
  vocabulário em `history.schema.ts`.
- Faltar a tela, o módulo ou a entrada no menu do Dashboard ou do Histórico reprova o CI (regra
  `standard-screens`).
- **Biblioteca nova para algo que outro sistema já resolveu**: use a mesma, na mesma versão
  (`docs/approved-libraries.md`).

## Promoção para produção

Ao sair do MVP ou preparar deploy, siga `.claude/skills/production-standard/SKILL.md`; nomes, Komodo, imagem e Valkey seguem `.claude/rules/infra.md`. SQLite fica no MVP; PostgreSQL e o Valkey isolado do ambiente são obrigatórios após promoção. O driver do PostgreSQL é sempre `pg` (`drizzle-orm/node-postgres`), nunca `postgres` (postgres.js) — o `production-contract` reprova. Execute `node scripts/production-contract.mjs`.
