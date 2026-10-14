---
name: design-system
description: A regra de organização do projeto inteiro — onde cada arquivo mora (client, server, shared, agent, docs), prefixo azuos-* em componente e use-* em hook, componente genérico em lib e componente de feature em routes/{feature}/components, h-10 em todo campo de formulário, nunca reescrever componente, idioma de infra (bucket, pasta, arquivo, env) em inglês, onde ficam testes, stories e docs. Consulte ANTES de criar, mover ou renomear qualquer arquivo, e ao revisar se algo está no lugar certo.
---

# Sistema de design do projeto

Esta skill é a **fonte da verdade de estrutura**. `ui-component` diz *como escrever* um
componente, `ui-standards` diz *como a tela parece*; aqui está **onde cada coisa mora, como se
chama e o que é proibido**. Em conflito com outro texto do repositório, vale esta skill.

Antes de criar qualquer arquivo, responda as quatro perguntas:

1. **Já existe?** (§4 — no projeto ou no shadcn-svelte)
2. **Onde mora?** (§2 e §3)
3. **Como se chama?** (§5)
4. **O idioma está certo?** (§7)

---

## 1. Invariantes (não negociáveis)

| # | Regra |
|---|---|
| I1 | **Nunca reescrever componente existente.** Mudança só no trecho pedido. Pediram cor? Muda a cor. Não reorganiza markup, não troca biblioteca, não "melhora" o resto. |
| I2 | **Nunca recriar à mão o que o shadcn-svelte já tem.** Instala pelo CLI e envolve num `azuos-*`. |
| I3 | **`lib/components/ui/` e `lib/hooks/ui/` são do CLI.** Não se editam. Só o `npx shadcn-svelte add` escreve ali. |
| I4 | **Todo componente próprio tem prefixo `azuos-*`**, genérico ou de feature. |
| I5 | **Todo hook próprio mora em `lib/hooks/use-<nome>/use-<nome>.svelte.ts`.** Pasta própria, prefixo `use-`, nunca arquivo solto. |
| I6 | **Componente genérico em `lib/components/`; componente de feature em `routes/<feature>/components/`.** |
| I7 | **Todo campo de formulário tem `h-10`, definido no `azuos-*`.** Nem mais, nem menos. A tela nunca compensa altura. |
| I8 | **A rota só compõe.** Em `routes/` só entra classe de cor, espaço e layout. Nunca UI/UX de componente. |
| I9 | **O usuário não vê → inglês.** Inclui pasta de bucket, chave de storage, nome de arquivo, variável de ambiente. |

---

## 2. Mapa do repositório

Tudo relativo à raiz do repositório.

```
CLAUDE.md  CONTRIBUTING.md  README.md      regras e entrada (MAIÚSCULO por convenção)
.claude/skills/<name>/SKILL.md             skills (nome em inglês)
.claude/commands/<nome-pt>.md              atalho pt-BR que delega para a skill (§7.3)
.github/                                    CI e template de PR

chamados/dashboard/
├── shared/src/
│   ├── domain/<nome>.util.ts (+ .test.ts)  regra pura, sem I/O
│   └── schemas/<entity>.schema.ts (+ .test.ts)  contrato Zod (API e formulário)
├── server/
│   ├── src/lib/<infra>/                    auth, config, db, http, policy, report, security, storage
│   ├── src/lib/db/schema/<entities>.schema.ts   tabelas Drizzle
│   ├── src/modules/<entities>/
│   │   ├── <entities>.module.ts
│   │   ├── controller/  dto/  mapper/  repository/  service/
│   ├── drizzle/                            migrations geradas — não edite
│   └── test/<fluxo>.e2e.ts                 E2E da API
├── client/
│   ├── src/lib/
│   │   ├── api/<entities>.api.ts           uma função por endpoint
│   │   ├── components/ui/                  ⛔ CLI do shadcn
│   │   ├── components/azuos-<nome>/      componente GENÉRICO
│   │   ├── hooks/ui/                       ⛔ CLI do shadcn (hooks que o shadcn gera)
│   │   ├── hooks/use-<nome>/               hook próprio (view-model)
│   │   ├── navigation/  theme/  motion/  types/  utils/
│   ├── src/routes/
│   │   ├── (app)/<context>/<feature>/
│   │   │   ├── +page.svelte                só composição
│   │   │   ├── <nome>-slot.svelte          liga hook → componente (pode chamar hook)
│   │   │   └── components/azuos-<nome>/  componente DA FEATURE
│   ├── e2e/<fluxo>.e2e.ts                  E2E da web (Playwright)
│   └── tests/                              mocks e apoio de teste
├── bot/                                    bot de WhatsApp — pacote À PARTE (não é workspace)
│   └── src/
│       ├── main.ts                         sobe o bot
│       ├── lib/<infra>/                    config, http, storage — mesmo desenho do server
│       └── modules/<assunto>/              sessions, conversations
└── scripts/seed/<entities>/                dados de teste

chamados/agent/
├── src-go/<pacote>/<arquivo>.go (+ _test.go)   pacotes Go, nome curto em inglês
├── svelte/src/lib/components/azuos-<nome>/   mesmo padrão do dashboard
├── svelte/src/routes/<tela>/<tela>.svelte
└── docs/<nome-kebab>.md                        conteúdo em pt-BR, nome em inglês
```

**`<context>` é `infra`, `system` ou `maintenance`** — o contexto mora no endereço
(`/infra/tickets`, `/system/tickets`, `/maintenance/tickets`), e cada um tem o próprio
`+page.svelte`. A feature é a pasta de dentro (`infra/computers`). Componente usado pela mesma
tela em mais de um contexto (os de Chamados) é compartilhado e mora em `lib/components/`. Só o
que não é de contexto nenhum (`profile`, `roles`) fica direto em `routes/(app)/`. A margem do
conteúdo é da casca (`azuos-app-shell`): o elemento raiz da tela não leva `px-*`/`pt-*`/`pb-*`.

**O `bot/` tem `package.json` e instalação próprios**, de propósito: o Baileys depende de código
GPL, e mantê-lo fora dos workspaces é o que deixa o resto do projeto MIT
(`chamados/dashboard/docs/whatsapp-bot.md`). Por dentro vale o padrão do server: `lib/<infra>/`
e `modules/<assunto>/`, todo arquivo com sufixo de papel (`.schema.ts`, `.type.ts`, `.util.ts`)
e o `.test.ts` ao lado. Não é Nest: não há `controller/`, `service/` nem `repository/`.

**Pasta que não está neste mapa não é criada.** Precisa de uma pasta nova em `lib/`? Pare e
pergunte. Pasta fora deste mapa (um `lib/table-view/`, um `lib/context/`) é violação — o check reprova.

---

## 3. Camadas do client — onde cada componente mora

```
lib/components/ui/<x>/            ← CLI. Bruto, sem nossa altura/variante.
        ▲ só é importado por
lib/components/azuos-<x>/       ← GENÉRICO. Envolve o ui, aplica tv(), h-10, tokens.
        ▲ importado por
routes/<feature>/components/azuos-<y>/  ← DA FEATURE. Compõe genéricos. Conhece o domínio.
        ▲ importado por
routes/<feature>/+page.svelte · <nome>-slot.svelte  ← COMPOSIÇÃO. Hook + componente.
```

### 3.1 Árvore de decisão

```
O componente conhece uma entidade, texto ou layout de UMA tela?
├─ sim → routes/<feature>/components/azuos-<nome>/
└─ não → É usado (ou claramente será) por 2+ features, sem regra de domínio?
         ├─ sim → lib/components/azuos-<nome>/
         └─ não → routes/<feature>/components/azuos-<nome>/
```

Sinais de que está no lugar errado:

- Nome da feature dentro de `lib/components/` (`azuos-dashboard-*`, `azuos-computer-*`,
  `azuos-ticket-*`) → é de feature.
- Componente em `lib/components/` importado por **uma rota só** → é de feature.
- Componente em `routes/a/components/` importado por `routes/b/` → subiu a genérico: mova para
  `lib/components/` tirando o domínio (o domínio fica num componente da feature que o usa).

Componente de feature **nunca** é importado por outra feature. Se precisa, ele é genérico.

### 3.2 O que cada camada pode

| Camada | Pode | Não pode |
|---|---|---|
| `components/ui` | — (é do CLI) | ser editado; ser importado fora de `lib/components/azuos-*` |
| `azuos-*` genérico | importar `ui/*`, `tv()`, `cn()`, tokens, `$state` visual, `$derived` | conhecer entidade de domínio; `createQuery`/`createMutation`/`goto` |
| `azuos-*` de feature | importar `azuos-*` genéricos e tipos do `shared` | importar `ui/*` direto; importar componente de outra feature; hook de dado |
| `+page.svelte` / `*-slot.svelte` | chamar hook, passar `data/ui/state/actions`, classes de cor/espaço/layout | markup próprio de componente (`<button>`, `<input>`, `<table>` estilizados), redefinir variante, estado ou comportamento |

**Teste da rota:** apague todas as classes do `+page.svelte`. Se a tela continua com os mesmos
componentes e o mesmo comportamento (só sem espaçamento), a rota está certa. Se some um botão,
um estado ou uma interação, a rota estava fazendo papel de componente → extraia para
`routes/<feature>/components/azuos-*`.

---

## 4. shadcn-svelte primeiro

Antes de escrever qualquer componente visual, consulte <https://www.shadcn-svelte.com/docs/components>.
Se existe lá (button-group, breadcrumb, collapsible, input-group, navigation-menu, combobox,
command…), **instale**:

```bash
cd chamados/dashboard/client
npx shadcn-svelte@latest add <nome> [<nome>...]
```

Depois:

1. Não toque no que chegou em `lib/components/ui/<nome>/` nem em `lib/hooks/ui/`.
2. Crie `lib/components/azuos-<nome>/` envolvendo o baixado (modelo: `azuos-button` do agent
   e o `azuos-action-button` do dashboard): variantes com `tv()`, cores por token, `h-10` se for campo
   (§6).
3. Story + teste (§8).

O `components.json` precisa de `"hooks": "$lib/hooks/ui"` para o hook que o CLI gera (ex.: o
`is-mobile` do `sidebar`) não cair solto em `lib/hooks/`.

**Proibido:** copiar o markup do shadcn para dentro de um `azuos-*` e editar. Isso é reescrever
o componente (I1/I2). Envolva; não clone.

---

## 5. Nomes

Tudo em `kebab-case`, inglês, singular para componente/hook, plural para módulo/tabela.

| Tipo | Padrão | Exemplo |
|---|---|---|
| Componente genérico | `lib/components/azuos-<nome>/azuos-<nome>.svelte` | `azuos-select/azuos-select.svelte` |
| Componente de feature | `routes/(app)/<context>/<feature>/components/azuos-<nome>/azuos-<nome>.svelte` | `routes/(app)/infra/dashboard/components/azuos-maintenance-log/azuos-maintenance-log.svelte` |
| Story / teste / harness | `azuos-<nome>.stories.svelte` · `.test.ts` · `-harness.test.svelte` | ao lado do componente |
| Tipo de props | `Azuos<Nome>Props` | `AzuosSelectProps` |
| Story title | `Components/Azuos<Nome>` · feature: `Features/<Feature>/Azuos<Nome>` | `Features/Dashboard/AzuosMaintenanceLog` |
| Hook | `lib/hooks/use-<nome>/use-<nome>.svelte.ts` | `use-media-query/use-media-query.svelte.ts` |
| Hook harness | `use-<nome>-harness.test.svelte` | |
| Slot de rota | `routes/(app)/<context>/<feature>/<nome>-slot.svelte` | `task-form-slot.svelte` |
| API client | `lib/api/<entities>.api.ts` | `tickets.api.ts` |
| Util | `<nome>.util.ts` | `format-date.util.ts` |
| Tipo | `<nome>.type.ts` | `form-field.type.ts` |
| Schema Zod | `<entity>.schema.ts` | `ticket.schema.ts` |
| Tabela Drizzle | `<entities>.schema.ts` | `tickets.schema.ts` |
| Módulo Nest | `<entities>.<papel>.ts` | `tickets.service.ts` |
| E2E | `<fluxo>.e2e.ts` | `tickets.e2e.ts` |
| Doc | `docs/<nome-kebab>.md` | `docs/remote-reporting.md` |
| Branch | `feature/<nome-kebab>` · `bugfix/<nome-kebab>` | |

Export nomeado. Sem barril (`index.ts`) fora de `ui/`.

---

## 6. Campos de formulário: `h-10`

Todo controle que recebe digitação ou escolha em formulário/filtro tem **exatamente `h-10`**,
aplicado **no `azuos-*`**, nunca no `ui/` (o CLI sobrescreve) e nunca na rota.

| Componente próprio | Envolve |
|---|---|
| `azuos-text-field` | `ui/input` |
| `azuos-select-field` | `ui/select` — no `SelectTrigger` |
| `azuos-input-group` | `ui/input-group` |
| `azuos-date-picker` | `ui/button` + `ui/calendar` + `ui/popover` |
| `azuos-option-picker` | `ui/popover` — os 40px são do trilho inteiro (pastilhas) ou do gatilho (combo) |
| `azuos-submit-button` / `azuos-button` com `size` de formulário | `ui/button` |

`azuos-text-area-field` não tem altura fixa (é multilinha): usa `min-h-*`.

Como aplicar: na variante `tv()` base do wrapper, a utilidade `control-lg` (40px = `h-10`,
definida em `tokens.css`) + `rounded-control`. Filtro também é campo: `control-lg`. `control-sm`
fica para ação dentro de linha de tabela/cartão (skill `ui-standards` §3.4). A prop `ui.size` **não** muda a altura
de campo de formulário. Verificação:

```bash
rg -n '\bh-(7|8|9|11|12)\b' chamados/dashboard/client/src/routes   # deve voltar vazio
```

---

## 7. Idioma

Regra-mãe (CONTRIBUTING §1): **o usuário vê → pt-BR. O usuário não vê → inglês.** Comentário é
pt-BR.

### 7.1 Infra é inglês, sem exceção

| O quê | Certo | Errado |
|---|---|---|
| Pasta/prefixo em bucket R2/S3 | `tickets/`, `ticket-attachments/`, `files/` | `chamados/`, `chamados-anexos/`, `arquivos/` |
| Chave de objeto, nome de fila, nome de métrica | `ticket.created` | `chamado.criado` |
| Variável de ambiente | `R2_BUCKET_NAME` | `R2_NOME_BUCKET` |
| Nome de arquivo e pasta (código **e** docs) | `docs/architecture.md` | `docs/ARQUITETURA.md` |
| Identificador (variável, função, tipo, coluna, rota) | `maintenance` | `manutencao` |
| Fixture de teste | `'tickets/abc.png'` | `'chamados/abc.png'` |

Constante de pasta mora no service que usa, em inglês e com nome em SCREAMING_CASE
(`const SCREENSHOT_FOLDER = 'tickets'`). Mudar a pasta deixa os objetos antigos no prefixo velho: em desenvolvimento, limpe o bucket;
em produção, copie os objetos antes.

### 7.2 Continua pt-BR

Nome de arquivo **baixado pelo usuário** (`chamados.csv`), texto de tela, `aria-label`,
mensagem de erro mostrada, conteúdo dos `.md`, commit e PR.

### 7.3 Skills: nome em inglês, atalho em pt-BR

Pasta e `name:` da skill em inglês (`.claude/skills/troubleshoot/`). Para a pessoa poder chamar
em português, cada skill tem um atalho em `.claude/commands/<nome-pt>.md` que só delega
(`/socorro` → `troubleshoot`). Skill não aceita apelido; o atalho é o comando. Conteúdo da skill
em pt-BR, identificador técnico em inglês.

---

## 8. Testes e stories

| O quê | Onde | Regra |
|---|---|---|
| Unidade (util, schema, mapper, service, policy) | ao lado: `<arquivo>.test.ts` | `// feliz` e `// triste` |
| Componente (`azuos-*`, genérico **e** de feature) | ao lado: `azuos-<nome>.test.ts` | consulta por papel/rótulo |
| Hook | `use-<nome>.test.ts` + `use-<nome>-harness.test.svelte` | |
| Story | `azuos-<nome>.stories.svelte` | Default, variantes de `ui`, estados, caso limite |
| E2E API | `server/test/<fluxo>.e2e.ts` | banco de teste (`TEST_DATABASE_URL`) |
| E2E web | `client/e2e/<fluxo>.e2e.ts` | Playwright |
| Mock compartilhado | `client/tests/` | nunca dado real |

Componente de feature em `routes/**/components/` **também** tem story e teste — o glob do
Storybook (`src/**/*.stories.svelte`) e do Vitest (`src/**/*.test.ts`) já cobrem `routes/`.
`+page.svelte` e `*-slot.svelte` não têm story.

`describe`/`it` e nome de story em inglês. Texto de exemplo em pt-BR, inventado.

---

## 9. Documentação

- Regra de código e processo: `CONTRIBUTING.md` (manda). Instrução para o Claude: `CLAUDE.md`.
  Procedimento: `.claude/skills/<nome>/SKILL.md`.
- Doc técnica de um pacote: `<pacote>/docs/<nome-kebab>.md` (nome em inglês, conteúdo pt-BR).
- Decisão de **por que** algo é assim: comentário no topo do arquivo, não doc separada.
- Doc nova que contradiz CONTRIBUTING/esta skill → atualize a regra no mesmo PR ou não crie.

---

## 10. Violações conhecidas

O que a migração de design (fases 1 a 7, registro em `chamados/dashboard/docs/design-migration.md`)
ainda não quitou. Cada linha é um commit separado; mover arquivo não muda conteúdo além de
import. O que saiu desta lista: prefixo `azuos-`, componente de feature em `lib`, hooks e
pastas de `lib`, cor/raio/fonte/sombra por token, rota só compõe, nome dos docs do agent, os
tokens do agent, o `ui/table` e o `ui/date-picker` editados à mão (hoje `azuos-table` e
`azuos-date-picker`) e os cinco componentes do shadcn que faltavam.

| Local | Violação | Destino |
|---|---|---|
| `agent/svelte/src/routes/dashboard/components/azuos-agent-identity` | `text-[11px]` na linha da estação (único item da baseline) | fica: em 12px a linha quebra em duas na janela de 1100px e empurra as abas |
| `azuos-role-list-view` (usado por `profile` e `roles`) | 2 rotas, mas de domínio | decidir: genérico sem domínio ou feature `roles` exportando para `profile` (proibido) → extrair parte genérica |
| `ui/input` h-8, `ui/select` h-8/h-9, `ui/button` h-7–9 | campo sem `h-10` | `h-10` nos `azuos-*` (§6) |
| `server/.../tickets.service.test.ts` `const manutencao`, `server/test/computers.e2e.ts` `const descarte` | identificador em pt | inglês |
| `azuos-dialog`, `azuos-sheet`, `azuos-popover`, `azuos-skeleton` | são só a porta de entrada do `ui/<x>` para a feature (um `.ts` que reexporta), sem variante nem story | virar componente de verdade quando o projeto precisar de variante própria |
| 12 listas com par cartão/tabela à mão | duplicação | `azuos-data-view` (skill `ui-standards` §6.4) |
| Storybook do dashboard | `storybook build` e `dev` recusam subir: o framework é `svelte-vite` e o projeto é SvelteKit | apontar o builder para um `vite.config` sem o plugin do SvelteKit (com os apelidos `$lib`/`$app` do `vitest.config.ts`) ou trocar para `@storybook/sveltekit` |

---

## 11. Checagem automática

As regras moram em `.claude/hooks/design/design-rules.mjs` (testadas em
`design-rules.test.mjs`) — `.mjs` puro, sem `tsx` e sem dependência, porque o mesmo módulo roda
em três lugares:

```bash
cd chamados/dashboard
npm run check:design              # reprova só violação NOVA (fora da baseline)
npm run check:design -- --all     # lista tudo, inclusive a dívida conhecida
npm run check:design -- --update  # depois de corrigir dívida: regrava a baseline menor
```

- **CI** e **`pre-push`**: o projeto inteiro, como acima.
- **Hook `PostToolUse` do Claude Code** (`.claude/settings.json`): depois de todo `Edit`/`Write`,
  roda sozinho (`check-design.mjs --hook`) e, se a edição introduziu violação nova — mesmo que
  fora da baseline de outro arquivo —, devolve a regra, a descrição e `arquivo:linha` para o
  Claude corrigir **na mesma tarefa**, antes de seguir. Arquivo fora da varredura (outro app,
  outra extensão) não paga custo nenhum: sai sem rodar as regras.

Cobre os **dois apps Svelte** (`APPS` em `design-rules.mjs`: `chamados/dashboard/client/src` e
`chamados/agent/svelte/src`) — mesmo prefixo `azuos-*`, mesmo `use-*`, mesmo mapa de `lib/`,
mesma fronteira de `ui/`, cada um comparado só contra si mesmo (import de uma feature do
dashboard não "é dono" de um componente do agent, e vice-versa). Cobre ainda: story e teste ao
lado, componente de feature em `lib` (seguindo a cadeia de imports), hooks, pastas de `lib`,
import entre features, markup e altura na rota, raio, paleta crua, fonte em px, sombra, par
cartão/tabela, pasta de bucket (só `chamados/dashboard/server/src`) e nome de doc (qualquer
`docs/*.md` dentro de `chamados/`).

A dívida existente está congelada em `.claude/hooks/design/design-baseline.json`. **Nunca
adicione linha nova à baseline para fazer o check passar** — corrija. A baseline só diminui.

Regra nova nas skills = regra nova em `design-rules.mjs` no mesmo PR, com teste feliz e triste
(incluindo um caso do agent quando a regra tocar componente, hook ou rota).
