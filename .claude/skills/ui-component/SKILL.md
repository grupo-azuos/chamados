---
name: ui-component
description: Cria ou altera um componente de tela azuos-* (genérico em lib/components ou de feature em routes/{feature}/components) no padrão do projeto — nunca reescreve o existente, instala do shadcn antes de criar, h-10 em campo de formulário, props em data/ui/state/actions, função pura sem hook de dado, story cobrindo variantes e estados, teste feliz e triste. Use quando for preciso um componente visual novo ("um cartão de cliente", "um seletor de data", "um gráfico"), mudar a aparência de um existente ou adicionar um componente do shadcn.
---

# Componente de UI

Leia antes `design-system` (onde mora, nome, h-10, proibições) e `ui-standards` (visual e
texto). Esta skill é o **como escrever**.

## 0. Proibido (sem exceção)

- **Reescrever componente existente.** Pediram mudança de cor, espaço ou texto? Mude só isso.
  Não reorganize markup, não troque implementação, não "aproveite para melhorar".
- **Recriar à mão o que o shadcn-svelte já tem** (button-group, breadcrumb, collapsible,
  input-group, navigation-menu…). Instale (§3).
- **Editar `lib/components/ui/` ou `lib/hooks/ui/`.**
- **Copiar o markup do shadcn para dentro do `azuos-*` e editar.** Envolva; não clone.
- **Definir UI/UX de componente dentro de `routes/`** (`+page.svelte`, `*-slot.svelte`). A rota
  só passa props e classes de cor/espaço/layout.

## 1. Já existe?

Procure, nesta ordem:

1. `client/src/lib/components/azuos-*/` (genéricos);
2. `client/src/routes/**/components/azuos-*/` da mesma feature;
3. <https://www.shadcn-svelte.com/docs/components>.

Dá para resolver compondo o que existe? Faça isso em vez de criar.

Catálogo genérico (nome-alvo; o backlog de renomeação está em `design-system` §10):

| Componente | Para |
|---|---|
| `azuos-action-button` | Todo botão de ação (primary/secondary/ghost/danger, ícone, carregando) |
| `azuos-submit-button` | O botão que envia formulário (`h-10`) |
| `azuos-text-field` / `azuos-text-area-field` / `azuos-select` | Campos com rótulo e erro colados (`h-10`; textarea usa `min-h`) |
| `azuos-option-picker` | Grupo de pastilhas de escolha (`h-10`, `flex-wrap`) |
| `azuos-filter-field` | O nome em cima de um filtro da barra de filtros |
| `azuos-status-badge` | Selo de situação (o tom vem do domínio) |
| `azuos-stat-card` + `azuos-stat-card-grid` | Número grande de painel |
| `azuos-progress-bar` | Andamento |
| `azuos-person-avatar` | Iniciais / foto |
| `azuos-echart` (a moldura de todos: carregando, vazio, tema, tamanho, rolagem) · `azuos-column-chart` (em pé ou deitada) · `azuos-stacked-bar-chart` · `azuos-donut-chart` · `azuos-area-chart` · `azuos-radar-chart` · `azuos-radial-chart` · `azuos-treemap-chart` · `azuos-heatmap-chart` · `azuos-calendar-chart` · `azuos-sankey-chart` · `azuos-chart-value-list` | Gráficos, todos no ECharts (clique vira filtro) |
| `azuos-page-header` | Topo de toda tela |
| `azuos-empty-state` / `azuos-error-state` | Vazio e erro |
| `azuos-app-shell` | A casca com menu (não mexa sem motivo) |
| `azuos-confirm-dialog` | Confirmar o que não tem volta |

## 2. Genérico ou de feature?

| | Genérico | De feature |
|---|---|---|
| Onde | `lib/components/azuos-<nome>/` | `routes/(app)/<context>/<feature>/components/azuos-<nome>/` |
| Conhece entidade do domínio? | Não | Sim |
| Importa `ui/*`? | Sim (é o único) | **Não** — só `azuos-*` genéricos |
| Quem importa | Qualquer feature | Só a própria feature |
| Exemplo | `azuos-text-field` | `azuos-maintenance-log` (dashboard) |

Na dúvida, é de feature. Sobe para genérico quando a segunda feature precisar — e sobe **sem o
domínio**.

## 3. Precisa de componente do shadcn?

```bash
cd chamados/dashboard/client
npx shadcn-svelte@latest add <nome> [<nome>...]
```

Vai para `lib/components/ui/` (e o hook que vier junto para `lib/hooks/ui/`) — **não edite o
que chegou**. Confira que o `cn` foi importado de `$lib/utils/cn`. Depois crie
`lib/components/azuos-<nome>/` que o envolve, com variantes em `tv()` (modelo:
`agent/svelte/src/lib/components/azuos-button/`). Ninguém fora de `lib/components/azuos-*`
importa `lib/components/ui/` (lint `no-restricted-imports`).

**Campo de formulário (input, select, input-group, date-picker, toggle-group, botão de
enviar): `h-10` na variante base do `azuos-*`.** Nem mais, nem menos; `ui.size` não muda
altura de campo. A tela nunca compensa altura.

## 4. Escrever — `azuos-<nome>/azuos-<nome>.svelte`

- Comentário no topo: **o que é e por que é assim** (a decisão, não a descrição do markup).
- Bloco `<script lang="ts" module>` para o que é estático (variantes com `tv()`, tipo de props);
  bloco `<script lang="ts">` para a instância, com `let { data, ui, state, actions }: Azuos<Nome>Props = $props();`
  (+ `children` na raiz quando compõe, via `Snippet`).
- `export type Azuos<Nome>Props = { data; ui?; state?; actions? }` no bloco `module`.
- **Zero** `createQuery`, `createMutation`, navegação imperativa de rota dentro do componente.
  Permitido: `$state` puramente visual (mostrar/esconder senha), `$derived` para computar a
  partir das props, `bind:` de DOM.
- Early return (`{#if}` cedo) para vazio/carregando/erro. Padrões (`??`, `?.`) em funções
  `resolve*` no bloco `module` se a complexidade passar de 10.
- Classes com `cn()`; cores por token (`text-ink-700`, `bg-brand-blue-800`, `text-destructive`).
- Acessibilidade: rótulo ligado ao campo (`for`/`useId` equivalente do Svelte), `aria-invalid` +
  `aria-describedby` no erro, `role="alert"` em falha, `aria-label` em botão só de ícone,
  `aria-hidden` em ícone decorativo, `type="button"` em botão que não envia.

## 5. Story — `azuos-<nome>.stories.svelte`

`title: 'Components/Azuos<Nome>'` (genérico) ou `'Features/<Feature>/Azuos<Nome>'` (de feature). No mínimo: `Default`, todas as variantes de `ui`, cada estado
(carregando, desabilitado, erro, vazio), e um **caso limite** (texto longo em coluna estreita,
um item só). Callbacks com `fn()` de `storybook/test`. Texto de exemplo inventado, em português.
Não nomeie story de `Error` (sombra o global) — use `LoadFailed`.

## 6. Teste — `azuos-<nome>.test.ts`

`describe('Azuos<Nome>')` e `it(...)` em inglês; `// feliz` e `// triste`. Consulte por papel e
rótulo (`getByRole('button', { name: 'Salvar' })`), como a pessoa enxerga. Teste: o que
aparece, o callback chamado com o valor certo, o estado travado, o erro anunciado. Quando o
componente precisa de um contexto Svelte pra montar (provider, slot), use um arquivo auxiliar
`azuos-<nome>-harness.test.svelte` do lado (veja `app-shell-nav-entry` como modelo).

## 7. Verificar

```bash
cd chamados/dashboard
npx vitest run --root client src/lib/components/azuos-<nome>   # ou src/routes/(app)/<context>/<feature>/components/azuos-<nome>
npm run lint -w client
npm run typecheck -w client
```

Para ver: `npm run storybook` → http://localhost:6006.
