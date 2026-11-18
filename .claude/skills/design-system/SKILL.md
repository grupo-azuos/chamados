---
name: design-system
description: A regra de organização do projeto inteiro — onde cada arquivo mora (client, server, shared, scripts, docs), prefixo azuos-* em componente e use-* em view-model, componente genérico em lib/components e componente de feature em routes/{feature}/components, a régua de altura dos controles (control-sm/md/lg) em todo campo e botão, nunca reescrever componente, idioma de infra (pasta, arquivo, variável de ambiente) em inglês, onde ficam testes e stories. Consulte ANTES de criar, mover ou renomear qualquer arquivo, e ao revisar se algo está no lugar certo.
---

# Sistema de design do projeto

Esta skill é a **fonte da verdade de estrutura**. `ui-component` diz *como escrever* um componente,
`ui-standards` diz *como a tela parece*; aqui está **onde cada coisa mora, como se chama e o que é
proibido**. Em conflito com outro texto do repositório, vale esta skill.

Antes de criar qualquer arquivo, responda as quatro perguntas:

1. **Já existe?** (§4 — no projeto ou no shadcn)
2. **Onde mora?** (§2 e §3)
3. **Como se chama?** (§5)
4. **O idioma está certo?** (§7)

---

## 1. Invariantes (não negociáveis)

| # | Regra |
|---|---|
| I1 | **Nunca reescrever componente existente.** Mudança só no trecho pedido. Pediram cor? Muda a cor. Não reorganiza marcação, não troca biblioteca, não "melhora" o resto. |
| I2 | **Nunca recriar à mão o que o shadcn já tem.** Instala pelo CLI e envolve num `azuos-*`. |
| I3 | **`lib/components/ui/` e `lib/hooks/ui/` são do CLI.** Não se editam. Só o `npx shadcn add` escreve ali. |
| I4 | **Todo componente próprio tem prefixo `azuos-*`**, genérico ou de feature — na pasta, no arquivo e no nome exportado (`AzuosTextField`). |
| I5 | **Todo view-model mora em `lib/view-models/use-<nome>.model.ts`.** Prefixo `use-`, sufixo `.model`, zero JSX. |
| I6 | **Componente genérico em `lib/components/`; componente de feature em `routes/<feature>/components/`.** |
| I7 | **Todo controle usa a RÉGUA DE ALTURA** (`control-sm` 32px, `control-md` 36px, `control-lg` 40px), definida no `azuos-*`. Nem mais, nem menos. A tela nunca compensa altura. |
| I8 | **A rota só compõe.** Em `routes/` só entra classe de cor, espaço e layout. Nunca UI/UX de componente. |
| I9 | **O usuário não vê → inglês.** Inclui nome de arquivo, nome de pasta, identificador e variável de ambiente. |

---

## 2. Mapa do repositório

Tudo relativo à raiz do repositório.

```
CLAUDE.md  CONTRIBUTING.md  README.md  SUPORTE.md   regras e entrada (MAIÚSCULO por convenção)
.claude/skills/<name>/SKILL.md                      skills (nome em inglês)
.claude/commands/<nome-pt>.md                       atalho pt-BR que delega para a skill (§7.3)
.claude/hooks/                                      protect-paths.mjs e o check de design (§11)
.github/                                            CI e template de PR

chamados/dashboard/
├── shared/src/
│   ├── domain/<nome>.util.ts (+ .test.ts)           regra pura, sem I/O
│   └── schemas/<entity>.schema.ts (+ .test.ts)      contrato Zod (API e formulário)
├── server/
│   ├── src/lib/<infra>/                             auth, config, db, http, policy
│   ├── src/lib/db/schema/<entities>.schema.ts       tabelas Drizzle (SQLite)
│   ├── src/modules/<entities>/
│   │   ├── <entities>.module.ts
│   │   ├── controller/  dto/  mapper/  repository/  service/
│   ├── drizzle/                                     migrations geradas — não edite
│   └── test/<fluxo>.e2e.ts                          E2E da API
├── client/
│   ├── src/lib/
│   │   ├── api/<entities>.api.ts                    uma função por endpoint
│   │   ├── components/ui/                           ⛔ CLI do shadcn
│   │   ├── components/azuos-<nome>/                 componente GENÉRICO
│   │   ├── hooks/ui/                                ⛔ CLI do shadcn (o que o CLI gera)
│   │   ├── hooks/use-<nome>/use-<nome>.ts           hook próprio de comportamento
│   │   ├── view-models/use-<nome>.model.ts          estado e dados de uma tela
│   │   ├── navigation/  theme/  motion/  types/  utils/
│   ├── src/routes/
│   │   ├── <feature>/index.tsx                      só composição
│   │   └── <feature>/components/azuos-<nome>/       componente DA FEATURE
│   ├── e2e/<fluxo>.e2e.ts                           E2E da web (Playwright)
└── scripts/seed/<entities>/                         dados de teste
```

**Pasta que não está neste mapa não é criada.** Precisa de uma pasta nova em `lib/`? Pare e
pergunte. Pasta fora deste mapa (um `lib/table-view/`, um `lib/context/`) é violação — o check
reprova.

> **Nota de divergência.** O projeto irmão (acerola) chama o view-model de `lib/hooks/use-<nome>/`,
> porque em Svelte hook e view-model são a mesma coisa. Aqui são duas: `lib/view-models/` guarda o
> estado de UMA TELA (fala com a API), e `lib/hooks/` guarda comportamento reaproveitável que não
> busca dado (`use-media-query`, `use-table-view`, `use-effects`). A separação é o que mantém o
> ESLint capaz de proibir JSX num e `useQuery` no outro.

---

## 3. Camadas do client — onde cada componente mora

```
lib/components/ui/<x>.tsx            ← CLI. Bruto, sem nossa altura/variante.
        ▲ só é importado por
lib/components/azuos-<x>/            ← GENÉRICO. Envolve o ui, aplica tv(), a régua, tokens.
        ▲ importado por
routes/<feature>/components/azuos-<y>/  ← DA FEATURE. Compõe genéricos. Conhece o domínio.
        ▲ importado por
routes/<feature>/index.tsx           ← COMPOSIÇÃO. View-model + componente.
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

- Nome da feature dentro de `lib/components/` (`azuos-task-*`, `azuos-client-*`) → é de feature. **É
  este o sinal que o `check:design` usa**: "usado por uma rota só" não serve sozinho num template que
  nasce com UMA feature de exemplo — pela contagem, até o `azuos-page-header` seria de feature.
- Componente em `lib/components/` importado por **uma rota só** E com cara de domínio → é de feature.
- Componente em `routes/a/components/` importado por `routes/b/` → subiu a genérico: mova para
  `lib/components/` tirando o domínio (o domínio fica num componente da feature que o usa).

Componente de feature **nunca** é importado por outra feature. Se precisa, ele é genérico.

### 3.2 O que cada camada pode

| Camada | Pode | Não pode |
|---|---|---|
| `components/ui` | — (é do CLI) | ser editado; ser importado fora de `lib/components/azuos-*` |
| `azuos-*` genérico | importar `ui/*`, `tv()`, `cn()`, tokens, `useState` visual, `useId` | conhecer entidade de domínio; `useQuery`/`useMutation`/`useNavigate` |
| `azuos-*` de feature | importar `azuos-*` genéricos e tipos do `shared` | importar `ui/*` direto; importar componente de outra feature; hook de dado |
| `routes/**/index.tsx` | chamar view-model, passar `data/ui/state/actions`, classes de cor/espaço/layout | marcação própria de componente (`<button>`, `<input>`, `<table>` estilizados), redefinir variante, estado ou comportamento |

**Teste da rota:** apague todas as classes do `index.tsx`. Se a tela continua com os mesmos
componentes e o mesmo comportamento (só sem espaçamento), a rota está certa. Se some um botão, um
estado ou uma interação, a rota estava fazendo papel de componente → extraia para
`routes/<feature>/components/azuos-*`.

---

## 4. shadcn primeiro

Antes de escrever qualquer componente visual, consulte <https://ui.shadcn.com/docs/components>.
Se existe lá (accordion, checkbox, command, dropdown-menu, radio-group, switch, tabs…),
**instale**:

```bash
cd chamados/dashboard/client
npx shadcn@latest add <nome> [<nome>...]
```

Depois:

1. Não toque no que chegou em `lib/components/ui/` nem em `lib/hooks/ui/`.
2. **Aponte o `cn` de volta.** O registro novo do shadcn importa `cn` de um pacote npm
   (`from "cn"`); o projeto tem o seu em `lib/utils/cn.util.ts`, documentado e único:
   ```bash
   sed -i 's#from "cn"#from "@/lib/utils/cn.util"#' src/lib/components/ui/*.tsx
   npm uninstall cn
   ```
   É a ÚNICA edição permitida no `ui/`, e é mecânica: o `components.json` já declara o apelido, e o
   CLI o ignora. Duas implementações de `cn` é pior que esta linha.
3. Crie `lib/components/azuos-<nome>/` envolvendo o baixado (modelo: `azuos-action-button`):
   variantes com `tv()`, cores por token, a régua de altura se for controle (§6).
4. Story + teste (§8).

**Proibido:** copiar a marcação do shadcn para dentro de um `azuos-*` e editar. Isso é reescrever o
componente (I1/I2). Envolva; não clone.

---

## 5. Nomes

Tudo em `kebab-case`, inglês, singular para componente/hook, plural para módulo/tabela.

| Tipo | Padrão | Exemplo |
|---|---|---|
| Componente genérico | `lib/components/azuos-<nome>/azuos-<nome>.component.tsx` | `azuos-select-field/azuos-select-field.component.tsx` |
| Componente de feature | `routes/<feature>/components/azuos-<nome>/azuos-<nome>.component.tsx` | `routes/tasks/components/azuos-task-row/azuos-task-row.component.tsx` |
| Story / teste | `azuos-<nome>.component.stories.tsx` · `azuos-<nome>.component.test.tsx` | ao lado do componente |
| Função exportada | `Azuos<Nome>` | `AzuosSelectField` |
| Tipo de props | `Azuos<Nome>Props` | `AzuosSelectFieldProps` |
| Story title | `Primitives/Azuos<Nome>` · compositor: `Composers/Azuos<Nome>` · feature: `Features/<Feature>/Azuos<Nome>` | `Primitives/AzuosSelectField` |
| Porta de entrada do `ui/` | `lib/components/azuos-<nome>/azuos-<nome>.ts` (só reexporta) | `azuos-dialog/azuos-dialog.ts` |
| View-model | `lib/view-models/use-<nome>.model.ts` | `use-task-list.model.ts` |
| Hook de comportamento | `lib/hooks/use-<nome>/use-<nome>.ts` | `use-media-query/use-media-query.ts` |
| API client | `lib/api/<entities>.api.ts` | `tasks.api.ts` |
| Util | `<nome>.util.ts` | `format-date.util.ts` |
| Tipo | `<nome>.type.ts` | `form-field.type.ts` |
| Schema Zod | `<entity>.schema.ts` | `task.schema.ts` |
| Tabela Drizzle | `<entities>.schema.ts` | `tasks.schema.ts` |
| Módulo Nest | `<entities>.<papel>.ts` | `tasks.service.ts` |
| E2E API | `<fluxo>.e2e.ts` | `tasks.e2e.ts` |
| E2E web | `<fluxo>.e2e.ts` | `tasks.e2e.ts` |
| Branch | `feature/<nome-kebab>` · `bugfix/<nome-kebab>` | |

Export nomeado. Sem barril (`index.ts`) em lugar nenhum — a porta de entrada do `ui/` é um arquivo
com nome próprio, não um `index`.

---

## 6. A régua de altura dos controles

Três degraus, definidos em `lib/theme/tokens.css`, aplicados **no `azuos-*`** — nunca no `ui/` (o
CLI sobrescreve) e nunca na rota.

| classe | altura | onde |
|---|---|---|
| `control-sm` | 32px | dentro de outra coisa: linha de tabela, rodapé de cartão, paginação |
| `control-md` | 36px | a ação da tela: cabeçalho e rodapé de diálogo, botão de enviar |
| `control-lg` | 40px | campo de formulário E de filtro: texto, data, seletor, combobox |

A regra que decide: **o que divide fileira tem que ter a mesma altura**. Um botão ao lado de um
campo é `control-lg`; o mesmo botão sozinho num cabeçalho é `control-md`.

`control-icon-*` é o irmão quadrado, para o botão que só tem ícone: a largura acompanha a ALTURA,
não o ícone dentro.

| Componente próprio | Envolve | Degrau |
|---|---|---|
| `azuos-text-field` | `ui/input` | `control-lg` |
| `azuos-select-field` | `ui/select` — no `SelectTrigger` | `control-lg` |
| `azuos-input-group` | `ui/input-group` | `control-lg` |
| `azuos-date-picker` | `ui/button` + `ui/calendar` + `ui/popover` | `control-lg` |
| `azuos-option-picker` | `ui/popover` — os 40px são do trilho inteiro ou do gatilho | `control-lg` |
| `azuos-submit-button` | — | `control-md` |
| `azuos-action-button` | `ui/button` | `sm`/`md`/`lg`, escolhido por quem usa |

`azuos-text-area-field` não tem altura fixa (é multilinha): usa o raio de controle e as linhas.

O RAIO é uma escala à parte, por PAPEL: `rounded-surface` (cartão, diálogo, tabela),
`rounded-control` (campo, botão, pastilha), `rounded-box` (bloco dentro de cartão, aviso, balão),
`rounded-chip` (miudeza dentro de um bloco). Nunca `rounded-lg`/`xl` escolhido no olho.

**O canto e a altura do componente baixado precisam ser VENCIDOS, não só acompanhados.** Todo
`ui/*` traz os seus de fábrica (`rounded-md`, `h-9`). Escrever `control-lg rounded-control` no
`azuos-*` só resolve se as classes do baixado saírem do elemento — com as duas no elemento, vence a
do baixado, e o campo sai com 8px de canto e 36px de altura sem nada acusar. Como se vence:

1. **Sempre pelo `cn()`** (`lib/utils/cn.util.ts`). Ele conhece a régua da casa: `rounded-control`
   derruba `rounded-md`, `control-lg` derruba `h-9` e `px-*`. Classe concatenada à mão não derruba
   nada.
2. **Altura imposta por variante se vence na mesma variante.** O `SelectTrigger` traz
   `data-[size=default]:h-9`, e variante ganha de classe solta: além do `control-lg`, o
   `azuos-select-field` escreve `data-[size=default]:h-(--control-lg)`. Ao envolver um `ui/*` novo,
   abra o arquivo dele e procure `rounded-` e `h-` com prefixo de variante.
3. **Todo campo novo entra na lista `FIELDS` de `lib/theme/control-ruler.test.tsx`**, que monta o
   campo e reprova qualquer canto ou altura concorrente que tenha sobrado no elemento. É a única
   checagem que pega a classe certa que perdeu o conflito.

A regra `field-ruler` do `check:design` cobra a outra metade: todo `azuos-*-field`,
`azuos-*-picker` e o `azuos-input-group` precisa ESCREVER `rounded-control` e `control-lg` (a área
de texto, só o canto).
Ela não cobra de quem COMPÕE outro campo (importa um `azuos-*-field`/`-picker` e só põe rótulo e
erro em volta), nem do que leva nome de campo mas não é controle de uma linha: caixa de marcar,
controle deslizante, casas de código e quadradinhos de cor.

Verificação:

```bash
rg -n '\bh-(7|8|9|11|12)\b' chamados/dashboard/client/src/routes   # deve voltar vazio
```

---

## 7. Idioma

Regra-mãe (CONTRIBUTING §1): **o usuário vê → pt-BR. O usuário não vê → inglês.** Comentário é
pt-BR, e explica o **porquê**.

### 7.1 Infra é inglês, sem exceção

| O quê | Certo | Errado |
|---|---|---|
| Nome de arquivo e pasta (código **e** docs) | `docs/architecture.md` | `docs/ARQUITETURA.md` |
| Identificador (variável, função, tipo, coluna, rota) | `maintenance` | `manutencao` |
| Variável de ambiente | `DATABASE_URL` | `URL_DO_BANCO` |
| Chave do `localStorage` | `azuos-theme` | `tema-azuos` |
| `describe`/`it` de teste, nome de story | `it('shows the label')` | `it('mostra o rótulo')` |
| Fixture de teste | `'tasks/abc.png'` | `'tarefas/abc.png'` |

### 7.2 Continua pt-BR

Nome de arquivo **baixado pelo usuário** (`tarefas.csv`), texto de tela, `aria-label`, mensagem de
erro mostrada, conteúdo dos `.md`, commit e PR, e o **dado de exemplo** dentro de story e teste
(nome de pessoa inventado, título de tarefa).

### 7.3 Skills: nome em inglês, atalho em pt-BR

Pasta e `name:` da skill em inglês (`.claude/skills/troubleshoot/`). Para a pessoa poder chamar em
português, cada skill tem um atalho em `.claude/commands/<nome-pt>.md` que só delega (`/troubleshoot` →
`troubleshoot`). Skill não aceita apelido; o atalho é o comando. Conteúdo da skill em pt-BR,
identificador técnico em inglês.

---

## 8. Testes e stories

| O quê | Onde | Regra |
|---|---|---|
| Unidade (util, schema, mapper, service, policy) | ao lado: `<arquivo>.test.ts` | `// feliz` e `// triste` |
| Componente (`azuos-*`, genérico **e** de feature) | ao lado: `azuos-<nome>.component.test.tsx` | consulta por papel/rótulo |
| View-model | `use-<nome>.model.test.tsx` | |
| Hook de comportamento | `use-<nome>.test.tsx` | |
| Story | `azuos-<nome>.component.stories.tsx` | Default, variantes de `ui`, estados, caso limite |
| E2E API | `server/test/<fluxo>.e2e.ts` | banco em memória |
| E2E web | `client/e2e/<fluxo>.e2e.ts` | Playwright |

**A REGRA DO NOME DO TESTE: arquivo + `.test`.** O sufixo de papel FICA — `format-date.util.ts` dá
`format-date.util.test.ts`, `use-task-list.model.ts` dá `use-task-list.model.test.tsx`, e
`azuos-text-field.component.tsx` dá `azuos-text-field.component.test.tsx`. Uma regra só, sem exceção
por tipo de arquivo: é o que evita a pergunta "neste aqui o sufixo cai ou fica?" a cada arquivo novo.
O mesmo vale para a story.

Componente de feature em `routes/**/components/` **também** tem story e teste — o glob do Storybook
(`src/**/*.stories.tsx`) e do Vitest (`src/**/*.test.{ts,tsx}`) já cobre `routes/`.
`routes/**/index.tsx` não tem story.

A porta de entrada do `ui/` (um `.ts` que só reexporta) não tem story nem teste: ela não decide
nada. No dia em que ganhar variante própria, vira `.component.tsx` e passa a ter os dois.

---

## 9. Documentação

- Regra de código e processo: `CONTRIBUTING.md` (manda). Instrução para o Claude: `CLAUDE.md`.
  Procedimento: `.claude/skills/<nome>/SKILL.md`. Contato do suporte: `SUPORTE.md`.
- Decisão de **por que** algo é assim: comentário no topo do arquivo, não doc separada.
- Doc nova que contradiz CONTRIBUTING/esta skill → atualize a regra no mesmo PR ou não crie.

---

## 10. Violações conhecidas

O que a adoção do sistema de design ainda não quitou. Cada linha é um commit separado; mover
arquivo não muda conteúdo além de import.

| Local | Violação | Destino |
|---|---|---|
| `azuos-task-list-view` (a única na baseline) | componente de FEATURE morando em `lib/components/` (I6) | mover para `routes/tasks/components/`, ou sair junto com a feature de exemplo (skill `remove-example`) |
| `azuos-task-form-dialog` | o mesmo caso, mas o check não o pega: ele é importado pelo view-model, e não pela rota, então a cadeia de donos dá "app inteiro" | sai junto com o `-list-view` |
| `azuos-dialog`, `azuos-popover`, `azuos-sheet`, `azuos-skeleton` | são só a porta de entrada do `ui/<x>` (um `.ts` que reexporta), sem variante nem story — permitido de propósito | virar componente de verdade quando o projeto precisar de variante própria |
| `lib/hooks/ui/use-mobile.ts` e `lib/hooks/use-media-query/` | duas formas de perguntar a largura da janela | a do CLI é do `ui/sidebar` e não se edita; a nossa é a que as telas usam |

**Nunca adicione linha nova a esta lista nem à baseline do check para fazê-lo passar** — corrija. A
lista só diminui.

---

## 11. Checagem automática

As regras moram em `.claude/hooks/design/design-rules.mjs` (testadas em `design-rules.test.mjs`) —
`.mjs` puro, sem dependência, porque o mesmo módulo roda em três lugares:

```bash
cd template
npm run check:design              # reprova só violação NOVA (fora da baseline)
npm run check:design -- --all     # lista tudo, inclusive a dívida conhecida
npm run check:design -- --update  # depois de corrigir dívida: regrava a baseline menor
```

- **CI** e **`pre-push`**: o projeto inteiro, como acima.
- **Hook `PostToolUse` do Claude Code** (`.claude/settings.json`): depois de todo `Edit`/`Write`,
  roda sozinho (`check-design.mjs --hook`) e, se a edição introduziu violação nova, devolve a regra,
  a descrição e `arquivo:linha` para o Claude corrigir **na mesma tarefa**, antes de seguir. Arquivo
  fora da varredura não paga custo nenhum: sai sem rodar as regras.

A dívida existente está congelada em `.claude/hooks/design/design-baseline.json`. A baseline só
diminui.

Regra nova nesta skill = regra nova em `design-rules.mjs` no mesmo PR, com teste feliz e triste.
