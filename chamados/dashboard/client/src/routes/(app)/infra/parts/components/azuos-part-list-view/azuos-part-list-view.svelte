<!--
  @component
  O DEPÓSITO: as peças de reposição que a TI tem em mãos.

  Cabeçalho com "Cadastrar peça"; no alto, os números (tipos de peça, peças na prateleira e sem
  estoque — os dois últimos são atalhos do filtro de estoque, e clicar de novo desliga). Depois, o
  cartão de filtros do grupo (a busca à vista; categoria, condição e estoque atrás do "Filtros") e
  a barra da lista (cards ou tabela à esquerda, as páginas ou a contagem à direita).
  Clicar na peça abre o extrato dela; cada uma tem "Entrada", "Saída" e "Corrigir" (no card, o
  cartão de registro `AzuosContentCard`, "Editar" mora no menu de três pontinhos).

  Peça com saldo zero NÃO some da lista: é por ela que alguém descobre o que precisa comprar. Ela
  aparece com o saldo em vermelho, e o filtro "só com estoque" é quem a esconde — quando a pergunta
  for outra. Lista cortada avisa, em vez de esconder o tamanho do depósito.

  Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando, vazia,
  filtrada sem resultado e em erro.

  - `data`: `parts`, `total`, `summary` e `filter`.
  - `state`: `isLoading`, `isRefetching`, `isEmpty`, `isFilteredOut`, `isTruncated`,
    `isSummaryLoading` e `error`.
  - `actions`: filtros (`onSearchChange`, `onCategoryChange`, `onConditionChange`,
    `onInStockOnlyChange`, `onOutOfStockOnlyChange`, `onClearFilters`), `onRetry`, `onRegister`,
    `onEdit`, `onMove(part, 'in' | 'out')` e `onOpenLedger`.
-->
<script lang="ts" module>
  import {
    PART_CATEGORIES,
    PART_CATEGORY_LABELS,
    PART_CONDITIONS,
    PART_CONDITION_LABELS,
    partCategoryLabel,
    partConditionLabel,
    partConditionTone,
    type PartCategory,
    type PartCondition,
  } from '@template/shared/domain/part-catalog.util';
  import { type Part } from '@template/shared/schemas/part.schema';

  export type PartListFilter = {
    search: string;
    category: PartCategory | '';
    condition: PartCondition | '';
    inStockOnly: boolean;
    outOfStockOnly: boolean;
  };

  export type PartSummary = { kinds: number; items: number; outOfStock: number };

  /**
   * O DEPÓSITO: as peças de reposição que a TI tem em mãos.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro.
   *
   * Peça com saldo zero NÃO some da lista: é por ela que alguém descobre o que precisa
   * comprar. Ela aparece com o saldo em vermelho, e o filtro "só com estoque" é quem a
   * esconde — quando a pergunta for outra.
   */
  export type AzuosPartListViewProps = {
    data: {
      parts: Part[];
      total: number;
      summary: PartSummary | null;
      filter: PartListFilter;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isTruncated: boolean;
      isSummaryLoading?: boolean;
      error: string | null;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onCategoryChange: (category: PartCategory | '') => void;
      onConditionChange: (condition: PartCondition | '') => void;
      onInStockOnlyChange: (inStockOnly: boolean) => void;
      onOutOfStockOnlyChange: (outOfStockOnly: boolean) => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onRegister: () => void;
      onEdit: (part: Part) => void;
      onMove: (part: Part, type: 'in' | 'out') => void;
      onOpenLedger: (part: Part) => void;
    };
  };

  const CATEGORY_FILTER_OPTIONS = PART_CATEGORIES.map((category) => ({
    value: category,
    label: PART_CATEGORY_LABELS[category],
  }));

  const CONDITION_FILTER_OPTIONS = PART_CONDITIONS.map((condition) => ({
    value: condition,
    label: PART_CONDITION_LABELS[condition],
    tone: partConditionTone(condition),
  }));

  /** "Estoque": a opção sem valor ("Todas") vem do `allLabel` do seletor. */
  const STOCK_OPTIONS = [
    { value: 'in', label: 'Com estoque', tone: 'success' as const },
    { value: 'out', label: 'Sem estoque', tone: 'danger' as const },
  ];

  /** Quantos dos filtros de trás do "Filtros" estão valendo — o número do botão. */
  export function advancedFilterCount(filter: PartListFilter): number {
    return [filter.category, filter.condition, stockValueOf(filter)].filter(Boolean).length;
  }

  /** As duas chaves do filtro (`inStockOnly`/`outOfStockOnly`) como UMA escolha de três. */
  function stockValueOf(filter: PartListFilter): string {
    if (filter.inStockOnly) return 'in';

    return filter.outOfStockOnly ? 'out' : '';
  }
</script>

<script lang="ts">
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
  import Layers from '@lucide/svelte/icons/layers';
  import Package from '@lucide/svelte/icons/package';
  import PackageCheck from '@lucide/svelte/icons/package-check';
  import PackageX from '@lucide/svelte/icons/package-x';
  import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
  import ArrowUpFromLine from '@lucide/svelte/icons/arrow-up-from-line';
  import History from '@lucide/svelte/icons/history';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';

  import CollapsibleFilters from '$lib/components/azuos-collapsible-filters/azuos-collapsible-filters.svelte';
  import ListToolbar from '$lib/components/azuos-list-toolbar/azuos-list-toolbar.svelte';
  import { useCardPage } from '$lib/hooks/use-card-page/use-card-page.svelte';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ActionMenu from '$lib/components/azuos-action-menu/azuos-action-menu.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import StatCardGrid from '$lib/components/azuos-stat-card-grid/azuos-stat-card-grid.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import TicketStockLinks from '$lib/components/azuos-ticket-stock-links/azuos-ticket-stock-links.svelte';
  import {
    Table,
    TableActionsCell,
    TableActionsHead,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableText,
  } from '$lib/components/azuos-table/azuos-table';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { cn } from '$lib/utils/cn';
  import { partCategoryIconOf } from '$lib/utils/record-icon.util';

  let { data, state: viewState, actions }: AzuosPartListViewProps = $props();
  /* A grade de cards pagina no navegador: a lista chega inteira (até o teto da consulta). */
  const cardPage = useCardPage(() => data.parts);

  const summary = $derived(data.summary);

  /* O menu da linha da tabela: o histórico, a entrada, a saída (só com saldo) e a correção. */
  function rowMenuOf(part: Part) {
    return [
      { id: 'ledger', label: 'Ver o histórico', icon: History },
      { id: 'in', label: 'Entrada', icon: ArrowDownToLine },
      ...(part.balance > 0 ? [{ id: 'out', label: 'Saída', icon: ArrowUpFromLine }] : []),
      { id: 'edit', label: 'Corrigir', icon: Pencil, separatorBefore: true },
    ];
  }

  const ROW_ACTIONS: Record<string, (part: Part) => void> = {
    ledger: (part) => actions.onOpenLedger(part),
    in: (part) => actions.onMove(part, 'in'),
    out: (part) => actions.onMove(part, 'out'),
    edit: (part) => actions.onEdit(part),
  };
  const tableView = useTableViewModel();

  const hasActiveFilter = $derived(
    Boolean(
      data.filter.search ||
        data.filter.category ||
        data.filter.condition ||
        data.filter.inStockOnly ||
        data.filter.outOfStockOnly,
    ),
  );

  /* Quem clica num cartão do topo precisa VER o resultado: a tela rola até os filtros. A
     referência só é usada dentro do clique, então é uma variável comum. */
  let filtersElement: HTMLElement | null = null;

  /* O filtro de estoque, vindo das pastilhas ou de um cartão do topo. Escolher o que já está
     valendo (clicar de novo no cartão) tira o filtro. */
  function chooseStock(value: string) {
    const next = value === stockValueOf(data.filter) ? '' : value;

    if (next === 'in') return actions.onInStockOnlyChange(true);
    if (next === 'out') return actions.onOutOfStockOnlyChange(true);

    actions.onInStockOnlyChange(false);
    actions.onOutOfStockOnlyChange(false);
  }

  function chooseStockFromCard(value: 'in' | 'out') {
    chooseStock(value);

    const prefersLessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    filtersElement?.scrollIntoView?.({
      behavior: prefersLessMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }
</script>

<div class="flex w-full flex-col gap-6">
  <PageHeader
    data={{
      title: 'Depósito',
      description: 'As peças de reposição que a TI tem em mãos.',
    }}
  >
    <ActionButton
      data={{ label: 'Cadastrar peça' }}
      ui={{ icon: Plus }}
      actions={{ onClick: actions.onRegister }}
    />
  </PageHeader>

  <StatCardGrid>
    <ContentCard data={{ label: 'Tipos de peça', title: 'Tipos de peça', highlight: { value: summary?.kinds ?? 0 } }} ui={{ icon: Layers, iconTone: 'brand' }} state={{ isLoading: viewState.isSummaryLoading }} />
    <!-- Estes dois são ATALHOS do filtro de estoque: "Peças na prateleira" mostra só o que tem
         saldo, "Sem estoque" só o que está zerado. Clicar de novo desliga. "Tipos de peça" é o
         total do cadastro — não filtra nada. -->
    <ContentCard data={{ label: 'Peças na prateleira', title: 'Peças na prateleira', highlight: { value: summary?.items ?? 0 } }} ui={{ icon: PackageCheck, iconTone: 'success' }} state={{ isLoading: viewState.isSummaryLoading, isSelected: data.filter.inStockOnly }} actions={{ onOpen: () => chooseStockFromCard('in') }} />
    <ContentCard data={{ label: 'Sem estoque', title: 'Sem estoque', highlight: { value: summary?.outOfStock ?? 0, hint: summary?.outOfStock ? 'são as que podem precisar de compra' : null } }} ui={{ icon: PackageX, iconTone: 'danger' }} state={{ isLoading: viewState.isSummaryLoading, isSelected: data.filter.outOfStockOnly }} actions={{ onOpen: () => chooseStockFromCard('out') }} />
  </StatCardGrid>

  <!-- O cartão de filtros do grupo (o de Empresas do paralegal): a busca à vista; categoria,
       condição e estoque atrás do "Filtros". "Limpar filtros" só aparece quando há o que limpar;
       quando o filtro escondeu tudo, quem o oferece é o aviso de lista vazia — dois botões iguais
       só confundem. -->
  <div bind:this={filtersElement} class="scroll-mt-4">
    <CollapsibleFilters
      data={{ label: 'Filtros das peças', activeCount: advancedFilterCount(data.filter) }}
      state={{ hasFilter: hasActiveFilter && !viewState.isFilteredOut }}
      actions={{ onClear: actions.onClearFilters }}
    >
      {#snippet primary()}
        <TextField
          data={{
            label: 'Buscar',
            name: 'search',
            value: data.filter.search,
            placeholder: 'Descrição da peça',
          }}
          actions={{ onChange: actions.onSearchChange }}
        />
      {/snippet}
      <div class="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FilterField data={{ label: 'Categoria' }} ui={{ className: 'sm:w-full' }}>
          <OptionPicker
            data={{ value: data.filter.category, options: CATEGORY_FILTER_OPTIONS }}
            ui={{ ariaLabel: 'Filtrar por categoria', allLabel: 'Todas as categorias' }}
            actions={{
              onChange: (value: string) => actions.onCategoryChange(value as PartCategory | ''),
            }}
          />
        </FilterField>
        <FilterField data={{ label: 'Condição' }} ui={{ className: 'sm:w-full' }}>
          <OptionPicker
            data={{ value: data.filter.condition, options: CONDITION_FILTER_OPTIONS }}
            ui={{ ariaLabel: 'Filtrar por condição', allLabel: 'Novas e usadas' }}
            actions={{
              onChange: (value: string) => actions.onConditionChange(value as PartCondition | ''),
            }}
          />
        </FilterField>
        <FilterField data={{ label: 'Estoque' }} ui={{ className: 'sm:w-full' }}>
          <OptionPicker
            data={{ value: stockValueOf(data.filter), options: STOCK_OPTIONS }}
            ui={{ ariaLabel: 'Filtrar por estoque', allLabel: 'Todas' }}
            actions={{ onChange: chooseStock }}
          />
        </FilterField>
      </div>
    </CollapsibleFilters>
  </div>

  <!-- A barra da lista: cards ou tabela à esquerda; à direita as páginas (cards) ou a contagem
       (tabela, que rola inteira). -->
  <ListToolbar
    data={{
      scroll: { loaded: data.parts.length, totalItems: data.total },
      pages: { page: cardPage.page, pageSize: cardPage.pageSize, totalItems: cardPage.total },
      noun: ['peça', 'peças'],
    }}
    state={{ isLoading: viewState.isLoading }}
    actions={{ onPageChange: cardPage.actions.onPageChange }}
  />

  <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
  {#if viewState.error}
    <ErrorState
      data={{ title: 'Não consegui carregar o depósito', message: viewState.error }}
      state={{ isRetrying: viewState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if viewState.isLoading}
    <!-- O esqueleto tem a forma da grade de cards: a tela não pula quando a lista chega. -->
    <div role="status" aria-label="Carregando as peças…" aria-busy="true" class="card-grid">
      {#each [0, 1, 2, 3, 4, 5] as slot (slot)}
        <Skeleton class="rounded-surface h-52 w-full" />
      {/each}
    </div>
  {:else if viewState.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhuma peça cadastrada',
        description:
          'Cadastre a primeira peça para começar a controlar o que entra e o que sai da prateleira.',
      }}
      ui={{ icon: Package }}
    >
      <ActionButton
        data={{ label: 'Cadastrar peça' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onRegister }}
      />
    </EmptyState>
  {:else if viewState.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhuma peça com esses filtros',
        description: 'Tente limpar os filtros para ver o depósito inteiro.',
      }}
      ui={{ icon: SearchX }}
    >
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    </EmptyState>
  {:else}
    <!-- Lista de cartões para mobile (< xl) -->
    <div
      class={cn('card-grid', !tableView.forceCards && 'xl:hidden')}
      data-slot="part-cards-mobile"
    >
      {#each cardPage.items as part (part.id)}
        <!-- O cartão de registro do sistema: o card inteiro abre o histórico da peça. Entrada e
             Saída ficam no rodapé (são o dia a dia do depósito); corrigir, no menu. -->
        <ContentCard
          data={{
            label: `Ver o histórico de ${part.name}`,
            title: part.name,
            meta: partCategoryLabel(part.category),
            status: { label: partConditionLabel(part.condition), tone: partConditionTone(part.condition) },
            tags: part.balance === 0 ? [{ label: 'Sem estoque', tone: 'danger' }] : [],
            metrics: [
              {
                key: 'balance',
                label: 'Na prateleira',
                value: String(part.balance),
                tone: part.balance === 0 ? 'danger' : 'success',
              },
            ],
            menu: {
              label: `Ações de ${part.name}`,
              items: [{ id: 'edit', label: 'Editar', icon: Pencil }],
            },
          }}
          ui={{
            icon: partCategoryIconOf(part.category),
            iconTone: partConditionTone(part.condition),
            slot: 'part-card',
          }}
          actions={{ onOpen: () => actions.onOpenLedger(part), onMenuSelect: () => actions.onEdit(part) }}
        >
          {#snippet notes()}
            <!-- Os chamados ligados têm link próprio: sobem acima do botão do card. -->
            <div class="relative z-20">
              <TicketStockLinks
                data={{ links: part.ticketLinks, balance: part.balance, ticketsPath: '/infra/tickets' }}
              />
            </div>
          {/snippet}
          {#snippet footerActions()}
            <ActionButton
              data={{ label: 'Entrada' }}
              ui={{ variant: 'secondary', size: 'sm' }}
              actions={{ onClick: () => actions.onMove(part, 'in') }}
            />
            <ActionButton
              data={{ label: 'Saída' }}
              ui={{ variant: 'secondary', size: 'sm' }}
              state={{ isDisabled: part.balance === 0 }}
              actions={{ onClick: () => actions.onMove(part, 'out') }}
            />
          {/snippet}
        </ContentCard>
      {/each}
    </div>
    <!-- No pé dos cards, a mesma barra de páginas: quem chegou ao último card troca de página
         sem rolar de volta. Na tabela, que rola inteira, ela não aparece. -->
    <ListToolbar
      data={{
        scroll: { loaded: data.parts.length, totalItems: data.total },
        pages: { page: cardPage.page, pageSize: cardPage.pageSize, totalItems: cardPage.total },
        noun: ['peça', 'peças'],
      }}
      ui={{ position: 'bottom' }}
      actions={{ onPageChange: cardPage.actions.onPageChange }}
    />

    <!-- Tabela para desktop (>= xl) -->
    <div
      class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
      data-slot="part-table-desktop"
    >
      <Table class="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead>Peça</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Condição</TableHead>
            <TableHead>Na prateleira</TableHead>
            <TableActionsHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.parts as part (part.id)}
            <TableRow class="align-top">
              <!-- O nome numa linha só, cortado com "…" no teto da coluna (o texto inteiro no balão):
                   quebrado em três linhas, ele espremia a tabela enquanto sobrava espaço ao lado. -->
              <TableCell style="white-space: normal;">
                <button
                  type="button"
                  class="text-ink-900 block max-w-72 text-left font-medium hover:underline"
                  onclick={() => actions.onOpenLedger(part)}
                >
                  <TableText data={{ text: part.name }} ui={{ className: 'max-w-72' }} />
                </button>
                <span class="text-ink-500 block text-xs">Ver o histórico desta peça</span>
                <TicketStockLinks
                  data={{ links: part.ticketLinks, balance: part.balance, ticketsPath: '/infra/tickets' }}
                />
              </TableCell>
              <TableCell class="text-ink-700">
                <TableText data={{ text: partCategoryLabel(part.category) }} ui={{ className: 'max-w-36' }} />
              </TableCell>
              <TableCell>
                <StatusBadge
                  data={{ label: partConditionLabel(part.condition) }}
                  ui={{ tone: partConditionTone(part.condition), size: 'sm' }}
                />
              </TableCell>
              <!-- O número fica na cor do texto (a cor mora no selo): zerado, o selo diz "Sem estoque". -->
              <TableCell class="text-foreground text-base font-semibold tabular-nums">
                <span class="flex items-center gap-2">
                  {part.balance}
                  {#if part.balance === 0}
                    <StatusBadge data={{ label: 'Sem estoque' }} ui={{ tone: 'danger', size: 'sm' }} />
                  {/if}
                </span>
              </TableCell>
              <!-- As ações da linha moram no menu de três pontinhos, na coluna estreita presa à
                   direita. Sem saldo, não há saída. -->
              <TableActionsCell>
                <ActionMenu
                  data={{ label: `Ações de ${part.name}`, items: rowMenuOf(part) }}
                  ui={{ isIconOnly: true }}
                  actions={{ onSelect: (id) => ROW_ACTIONS[id]?.(part) }}
                />
              </TableActionsCell>
            </TableRow>
          {/each}
        </TableBody>
        {#snippet footer()}
          <span>Controle de estoque e saldo de prateleira</span>
          <span>{data.parts.length} item(ns)</span>
        {/snippet}
      </Table>
    </div>

    <!-- Truncar calado é mentir sobre o tamanho do depósito. -->
    {#if viewState.isTruncated}
      <p class="text-ink-500 text-xs">
        Mostrando {data.parts.length} de {data.total} peças. Use os filtros para chegar ao que
        procura.
      </p>
    {/if}
  {/if}
</div>
