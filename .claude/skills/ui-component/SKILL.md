---
name: ui-component
description: Cria ou altera um componente de tela (azuos-* genérico ou de feature) no padrão do projeto — props em data/ui/state/actions, função pura sem hook de dado, régua de altura e raio por papel, story cobrindo variantes e estados, teste feliz e triste. Use quando for preciso um componente visual novo ("um cartão de cliente", "um seletor de data", "um gráfico"), mudar a aparência de um existente ou adicionar um componente do shadcn.
---

# Componente de UI

Leia também **`design-system`** (onde o arquivo mora e como se chama — manda) e **`ui-standards`**
(visual e texto).

## 1. Já existe?

Antes de criar, procure em `client/src/lib/components/`. O sistema de design já tem:

| Grupo | Componentes |
|---|---|
| Ação | `AzuosActionButton` (primary/secondary/ghost/danger, ícone, carregando, pressionado) · `AzuosSubmitButton` · `AzuosButtonGroup` · `AzuosReportExportActions` |
| Campo | `AzuosTextField` · `AzuosTextAreaField` · `AzuosSelectField` · `AzuosInputGroup` · `AzuosDatePicker` · `AzuosOptionPicker` · `AzuosFilterField` |
| Número | `AzuosStatCard` + `AzuosStatCardGrid` · `AzuosProgressBar` · `AzuosUsageMeter` |
| Selo e pessoa | `AzuosStatusBadge` · `AzuosPersonAvatar` · `AzuosBrandMark` |
| Superfície | `AzuosPanelCard` · `AzuosTable` (+ `Header`/`Head`/`Row`/`Cell`/`Footer`/`Actions`) · `AzuosCollapsible` |
| Gráfico (ECharts) | `AzuosEchart` (a moldura de todos: carregando, vazio, tema, tamanho, rolagem) · `AzuosChartLegend` · `AzuosChartValueList` (valores para leitor de tela) · `AzuosColumnChart` (em pé ou deitada) · `AzuosStackedBarChart` · `AzuosDonutChart` · `AzuosAreaChart` · `AzuosRadarChart` · `AzuosRadialChart` · `AzuosTreemapChart` · `AzuosHeatmapChart` · `AzuosCalendarChart` · `AzuosSankeyChart` |
| Navegação | `AzuosAppShell` (+ `NavEntry`) · `AzuosNavigationMenu` · `AzuosBreadcrumb` · `AzuosPaginationBar` · `AzuosTableViewToggle` |
| Diálogo | `AzuosResponsiveDialogContent` (troque o `DialogContent` por ele) · `AzuosConfirmDialog` |
| Estado | `AzuosEmptyState` · `AzuosErrorState` · `AzuosPendingArea` · `AzuosAppErrorBoundary` |
| Histórico | `AzuosTimeline` + `AzuosTimelineStep` · `AzuosHistoryTimeline` |
| Arquivo | `AzuosAttachmentList` · `AzuosAttachmentPicker` |
| Preferência | `AzuosThemeToggle` · `AzuosEffectsToggle` |
| Porta de entrada do `ui/` | `azuos-dialog` · `azuos-popover` · `azuos-sheet` · `azuos-skeleton` (só reexportam) |

Dá para resolver compondo os que existem? Faça isso em vez de criar. E **nunca reescreva um
componente existente** — mude só o trecho pedido.

## 2. Genérico ou de feature?

A árvore de decisão está na skill `design-system` §3.1. Em uma linha:

- **Genérico** (`lib/components/azuos-<nome>/`): não conhece entidade do domínio, serve a duas ou
  mais telas.
- **De feature** (`routes/<feature>/components/azuos-<nome>/`): conhece `Task`, `Customer`, o texto
  ou o layout de UMA tela.

## 3. Precisa de componente do shadcn?

```bash
cd chamados/dashboard/client
npx shadcn@latest add <nome>
```

Vai para `lib/components/ui/` — **não edite o que chegou**, com uma exceção mecânica: o registro
novo importa `cn` de um pacote npm (`from "cn"`), e o projeto tem o seu. Aponte de volta:

```bash
sed -i 's#from "cn"#from "@/lib/utils/cn.util"#' src/lib/components/ui/*.tsx
npm uninstall cn
```

Depois crie o `azuos-*` que o envolve, aplicando as variantes com `tv()` (modelo:
`azuos-action-button`). Fora de `lib/components/`, ninguém importa `components/ui`.

## 4. Escrever — `azuos-<nome>/azuos-<nome>.component.tsx`

- Comentário no topo: **o que é e por que é assim** (a decisão, não a descrição do JSX).
- `export type Azuos<Nome>Props = { data; ui?; state?; actions? }` (+ `children` na raiz quando
  compõe).
- `export function Azuos<Nome>(...)` — export nomeado, com o prefixo no nome.
- **Zero** `useQuery`, `useMutation`, `useNavigate`. Permitido: `useId`, `useRef` de DOM,
  `useState` puramente visual.
- Early return para vazio/carregando/erro. Padrões (`??`) em funções `resolve*`, e peças internas
  como subcomponentes, se a complexidade passar de 10 (o ESLint reprova).
- Classes com `cn()`. **Cor só por token** (`text-ink-700`, `bg-card`, `text-destructive`,
  `bg-success-soft`) — nunca a paleta crua do Tailwind.
- **Altura pela régua** (`control-sm` 32px · `control-md` 36px · `control-lg` 40px) e **raio por
  papel** (`rounded-surface` cartão · `rounded-control` campo e botão · `rounded-box` bloco ·
  `rounded-chip` miudeza). Sombra: `shadow-xs` em repouso, `shadow-xl` no que flutua. Detalhes na
  skill `design-system` §6.
- **Envolveu um `ui/*`? O canto e a altura dele têm de SAIR do elemento**, não conviver com os
  nossos: passe as classes pelo `cn()`, vença na mesma variante a altura que ele impõe por variante
  (`data-[size=default]:h-(--control-lg)` no seletor) e, se for campo, acrescente-o à lista
  `FIELDS` de `lib/theme/control-ruler.test.tsx`. O porquê e o passo a passo: `design-system` §6.
- Acessibilidade: rótulo ligado ao campo (`htmlFor`/`useId`), `aria-invalid` + `aria-describedby`
  no erro, `role="alert"` em falha, `aria-label` em botão só de ícone, `aria-pressed` no que liga e
  desliga, `aria-hidden` em ícone decorativo, `type="button"` em botão que não envia.

## 5. Story — `azuos-<nome>.component.stories.tsx`

`title: 'Primitives/Azuos<Nome>'` (ou `'Composers/…'`, ou `'Features/<Feature>/…'`). No mínimo:
`Default`, todas as variantes de `ui`, cada estado (carregando, desabilitado, erro, vazio) e um
**caso limite** (texto longo em coluna estreita, um item só, valor fora da faixa). Callbacks com
`fn()` de `storybook/test`. Texto de exemplo inventado, em português. Não nomeie story de `Error`
(sombra o global) — use `LoadFailed`.

## 6. Teste — `azuos-<nome>.component.test.tsx`

O nome é **o arquivo + `.test`**: o sufixo `.component` fica, como fica o `.util` e o `.model` nos
outros tipos. Uma regra só para todo o projeto.

`describe('Azuos<Nome>')` e `it(...)` em inglês; `// feliz` e `// triste`. Consulte por papel e
rótulo (`getByRole('button', { name: 'Salvar' })`), como a pessoa enxerga. Teste: o que aparece, o
callback chamado com o valor certo, o estado travado, o erro anunciado.

Select do Radix: use `fireEvent.click` para abrir e escolher (o `userEvent` trava no jsdom).
Componente que usa `Link` do TanStack precisa de um roteador mínimo em volta (modelo:
`azuos-app-shell-nav-entry.component.test.tsx`). Preferência de módulo (tema, efeitos, formato da lista) não
zera entre testes: escreva o teste lendo o estado de ANTES e verificando a mudança.

## 7. Verificar

```bash
cd template
npx vitest run --root client src/lib/components/azuos-<nome>
npm run lint -w client
npm run typecheck -w client
npm run check:design
```

Para ver: `npm run storybook` → http://localhost:6006.
