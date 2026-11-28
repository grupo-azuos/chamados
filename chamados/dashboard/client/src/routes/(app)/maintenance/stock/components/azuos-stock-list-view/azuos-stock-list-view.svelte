<!--
  @component
  O DEPÓSITO DA MANUTENÇÃO: quanto há de cada produto, e os dois botões que mudam o número.

  São os mesmos produtos do Inventário, lidos de outro jeito: lá importa O QUE é o produto (foto,
  lugar, etiqueta), aqui importa QUANTO há — e por NOME: "Cadeira", "CADEIRA" e "cadeira" são um
  cartão só, com a soma dos saldos e quantos cadastros o nome tem. Por isso o saldo é a caixinha de número do cartão
  (`AzuosContentCard`), com a unidade, e a foto nem aparece. Tem a busca, o filtro de categoria e o atalho
  "Sem estoque" (com quantos zeraram);
  cada cartão mostra o nome, a categoria e o lugar, os chamados ligados, o saldo com a unidade,
  "Entrada" e "Saída" — que fica apagada sem estoque, em vez de abrir um diálogo que o servidor
  recusaria. Depósito vazio é inventário vazio: o aviso leva ao Inventário.

  Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando, vazia,
  filtrada sem resultado e em erro.

  - `data`: `groups` (um por nome), `total`, `outOfStock` e `filter`.
  - `state`: `isLoading`, `isRefetching`, `isEmpty`, `isFilteredOut`, `isTruncated` e `error`.
  - `actions`: filtros (`onSearchChange`, `onCategoryChange`, `onOutOfStockOnlyChange`,
    `onClearFilters`), `onRetry`, `onEntry(group)`, `onExit(group)` e `onOpenInventory`.
-->
<script lang="ts" module>
  import {
    inventoryCategoryLabel,
    inventoryCategoryOptions,
    inventoryUnitLabel,
    type InventoryCategory,
  } from '@template/shared/domain/inventory-catalog.util';
  import { type StockGroup } from '$lib/utils/inventory-stock-group.util';

  /**
   * O DEPÓSITO DA MANUTENÇÃO: quanto há de cada produto, e os dois botões que mudam o número.
   *
   * São os mesmos produtos do Inventário, lidos de outro jeito: lá importa O QUE é o produto
   * (foto, lugar, etiqueta), aqui importa QUANTO há. Por isso o número é a maior coisa do
   * cartão, e a foto nem aparece.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro.
   */
  export type StockListFilterValues = {
    search: string;
    category: InventoryCategory | '';
    outOfStockOnly: boolean;
  };

  export type AzuosStockListViewProps = {
    data: {
      groups: StockGroup[];
      total: number;
      outOfStock: number;
      filter: StockListFilterValues;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isTruncated: boolean;
      error: string | null;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onCategoryChange: (category: InventoryCategory | '') => void;
      onOutOfStockOnlyChange: (outOfStockOnly: boolean) => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onEntry: (group: StockGroup) => void;
      onExit: (group: StockGroup) => void;
      onOpenInventory: () => void;
    };
  };

  const CATEGORY_FILTER_OPTIONS = inventoryCategoryOptions();
</script>

<script lang="ts">
  import ArrowDownLeft from '@lucide/svelte/icons/arrow-down-left';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import Package from '@lucide/svelte/icons/package';
  import SearchX from '@lucide/svelte/icons/search-x';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ActionMenu from '$lib/components/azuos-action-menu/azuos-action-menu.svelte';
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import CollapsibleFilters from '$lib/components/azuos-collapsible-filters/azuos-collapsible-filters.svelte';
  import ListToolbar from '$lib/components/azuos-list-toolbar/azuos-list-toolbar.svelte';
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
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
  import TicketStockLinks from '$lib/components/azuos-ticket-stock-links/azuos-ticket-stock-links.svelte';
  import { useCardPage } from '$lib/hooks/use-card-page/use-card-page.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { cn } from '$lib/utils/cn';
  import { inventoryCategoryIconOf } from '$lib/utils/record-icon.util';

  let { data, state: listState, actions }: AzuosStockListViewProps = $props();
  /* A grade de cards pagina no navegador: a lista chega inteira (até o teto da consulta). A
     tabela rola inteira (padrão do grupo). */
  const cardPage = useCardPage(() => data.groups);
  const tableView = useTableViewModel();

  const hasActiveFilter = $derived(
    data.filter.search.trim() !== '' || data.filter.category !== '' || data.filter.outOfStockOnly,
  );

  /* O atalho mostra quantos zeraram: é o número que faz a pessoa clicar nele. */
  const outOfStockLabel = $derived(
    data.outOfStock > 0 ? `Sem estoque (${data.outOfStock})` : 'Sem estoque',
  );

  /* A linha de baixo do nome: a categoria e, com um cadastro só, o lugar; com vários, quantos
     estão em uso (as cadeiras com pessoa e lugar no Inventário). */
  function detailOf(group: StockGroup): string {
    const where = group.items.length > 1 ? `${group.items.length} em uso` : group.items[0]?.location;

    return [inventoryCategoryLabel(group.category), where].filter(Boolean).join(' · ');
  }

  /* Na linha da tabela, Entrada e Saída moram no menu de três pontinhos (nunca botões
     enfileirados). Sem estoque não há o que tirar: a Saída nem aparece. */
  function menuOf(group: StockGroup) {
    return {
      label: `Movimentar ${group.name}`,
      items: [
        { id: 'in', label: 'Entrada', icon: ArrowDownLeft },
        ...(group.balance > 0 ? [{ id: 'out', label: 'Saída', icon: ArrowUpRight }] : []),
      ],
    };
  }

  function selectMenu(group: StockGroup, id: string) {
    if (id === 'out') {
      actions.onExit(group);
      return;
    }
    actions.onEntry(group);
  }
</script>

<div class="flex w-full flex-col gap-6">
  <PageHeader
    data={{
      title: 'Depósito',
      description: 'Quanto há de cada produto. Entrada soma, saída tira — e o número se explica.',
    }}
  />

  <!-- O cartão de filtros do grupo (o de Empresas do paralegal): a busca à vista, com o filtro principal; o resto atrás do "Filtros".
       "Limpar filtros" só aparece quando há o que limpar; quando o filtro escondeu tudo,
       quem o oferece é o aviso de lista vazia — dois botões iguais só confundem. -->
  <div class="flex flex-col gap-3">
    <CollapsibleFilters
      data={{ label: 'Filtros do saldo', activeCount: data.filter.outOfStockOnly ? 1 : 0 }}
      state={{ hasFilter: hasActiveFilter && !listState.isFilteredOut }}
      actions={{ onClear: actions.onClearFilters }}
    >
      {#snippet primary()}
        <TextField
          data={{
            label: 'Buscar',
            name: 'search',
            value: data.filter.search,
            placeholder: 'Nome do produto, onde fica ou código de patrimônio',
          }}
          actions={{ onChange: actions.onSearchChange }}
        />
        <FilterField ui={{ className: 'sm:w-full' }} data={{ label: 'Categoria' }}>
          <OptionPicker
            data={{ value: data.filter.category, options: CATEGORY_FILTER_OPTIONS }}
            ui={{ ariaLabel: 'Filtrar por categoria', allLabel: 'Todas as categorias' }}
            actions={{
              onChange: (value: string) => actions.onCategoryChange(value as InventoryCategory | ''),
            }}
          />
        </FilterField>
      {/snippet}
      <div class="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FilterField ui={{ className: 'sm:w-full' }} data={{ label: 'Estoque' }}>
          <OptionPicker
            data={{
              value: data.filter.outOfStockOnly ? 'empty' : '',
              options: [{ value: 'empty', label: outOfStockLabel }],
            }}
            ui={{ ariaLabel: 'Filtrar por estoque', allLabel: 'Todos' }}
            actions={{
              onChange: (value: string) => actions.onOutOfStockOnlyChange(value === 'empty'),
            }}
          />
        </FilterField>
      </div>
    </CollapsibleFilters>
  </div>

  <!-- A barra da lista: cards ou tabela à esquerda; à direita as páginas (cards) ou a contagem
       (tabela, que rola inteira). Carregando, vazia ou com erro, não há lista para contar. -->
  {#if !listState.isLoading && !listState.error && !listState.isEmpty}
    <ListToolbar
      data={{
        scroll: { loaded: data.groups.length, totalItems: data.total },
        pages: { page: cardPage.page, pageSize: cardPage.pageSize, totalItems: cardPage.total },
        noun: ['produto', 'produtos'],
      }}
      actions={{ onPageChange: cardPage.actions.onPageChange }}
    />
  {/if}

  <!-- Os estados vêm PRIMEIRO, e cada um encerra a leitura (CONTRIBUTING §2). -->
  {#if listState.error}
    <ErrorState
      data={{ message: listState.error, title: 'Não consegui carregar o depósito' }}
      state={{ isRetrying: listState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if listState.isLoading}
    <!-- O esqueleto tem a FORMA da grade: sem isso, a tela pula quando o conteúdo chega. -->
    <div class="card-grid" aria-busy="true" aria-label="Carregando o depósito" role="status">
      {#each Array.from({ length: 6 }, (_, index) => index) as index (index)}
        <div class="bg-card shadow-card rounded-surface flex flex-col gap-3 p-4">
          <Skeleton class="h-3 w-1/4" />
          <Skeleton class="h-4 w-2/3" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="mt-4 h-6 w-1/2" />
        </div>
      {/each}
    </div>
  {:else if listState.isEmpty}
    <!-- Depósito vazio é inventário vazio: o produto nasce lá, e só depois ganha estoque. -->
    <EmptyState
      data={{
        title: 'Nenhum produto para guardar ainda',
        description: 'O depósito conta os produtos do inventário. Cadastre o primeiro por lá.',
      }}
      ui={{ icon: Package }}
    >
      <ActionButton data={{ label: 'Abrir o inventário' }} actions={{ onClick: actions.onOpenInventory }} />
    </EmptyState>
  {:else if listState.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhum produto com esse filtro',
        description: 'Tente outra categoria, ou limpe o filtro para ver tudo.',
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
    <section class="flex flex-col gap-3" aria-label="Saldo do depósito">

      <!-- 1. Cards: sempre no estreito (< xl), ou quando a pessoa pediu cards. O depósito não tem
           ficha: o cartão não abre nada, e as ações (Entrada, Saída) moram no rodapé. -->
      <div class={cn('card-grid', !tableView.forceCards && 'xl:hidden')} data-slot="stock-cards">
        {#each cardPage.items as item (item.key)}
          <ContentCard
            data={{
              label: item.name,
              title: item.name,
              code: item.items.length === 1 ? item.items[0]!.code : null,
              meta: detailOf(item),
              status:
                item.balance === 0
                  ? { label: 'Sem estoque', tone: 'danger' }
                  : { label: 'Com estoque', tone: 'success' },
              metrics: [
                {
                  key: 'balance',
                  label: inventoryUnitLabel(item.unit),
                  value: String(item.balance),
                  tone: item.balance === 0 ? 'danger' : 'success',
                },
              ],
            }}
            ui={{
              icon: inventoryCategoryIconOf(item.category),
              iconTone: item.balance === 0 ? 'danger' : 'slate',
              slot: 'stock-card',
            }}
          >
            {#snippet notes()}
              <TicketStockLinks
                data={{
                  links: item.ticketLinks,
                  balance: item.balance,
                  ticketsPath: '/maintenance/tickets',
                }}
              />
            {/snippet}
            {#snippet footerActions()}
              <ActionButton
                data={{ label: 'Entrada' }}
                ui={{ variant: 'secondary', size: 'sm', icon: ArrowDownLeft }}
                actions={{ onClick: () => actions.onEntry(item) }}
              />
              <!-- Sem estoque não há o que tirar: o botão fica apagado em vez de abrir um
                   diálogo que só serviria para o servidor recusar. -->
              <ActionButton
                data={{ label: 'Saída' }}
                ui={{ variant: 'secondary', size: 'sm', icon: ArrowUpRight }}
                state={{ isDisabled: item.balance === 0 }}
                actions={{ onClick: () => actions.onExit(item) }}
              />
            {/snippet}
          </ContentCard>
        {/each}
      </div>
    <!-- No pé dos cards, a mesma barra de páginas: quem chegou ao último card troca de página
         sem rolar de volta. Na tabela, que rola inteira, ela não aparece. -->
    <ListToolbar
      data={{
        scroll: { loaded: data.groups.length, totalItems: data.total },
        pages: { page: cardPage.page, pageSize: cardPage.pageSize, totalItems: cardPage.total },
        noun: ['produto', 'produtos'],
      }}
      ui={{ position: 'bottom' }}
      actions={{ onPageChange: cardPage.actions.onPageChange }}
    />

      <!-- 2. Tabela: só quando a tela cabe (>= xl) E a pessoa não preferiu cards. Rola inteira. -->
      <div
        class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
        data-slot="stock-table"
      >
        <Table class="min-w-[820px]">
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria e lugar</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Chamados</TableHead>
              <TableActionsHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each data.groups as group (group.key)}
              <TableRow class="align-top">
                <TableCell>
                  <!-- O nome numa linha só, cortado com "…" no teto da coluna (o inteiro no balão). -->
                  <span class="text-foreground block font-medium">
                    <TableText data={{ text: group.name }} ui={{ className: 'max-w-72' }} />
                  </span>
                  {#if group.items.length === 1 && group.items[0]!.code}
                    <span class="text-muted-foreground block font-mono text-xs">{group.items[0]!.code}</span>
                  {/if}
                </TableCell>
                <TableCell class="text-muted-foreground">
                  <TableText data={{ text: detailOf(group) }} ui={{ className: 'max-w-48' }} />
                </TableCell>
                <TableCell>
                  <span class="flex items-center gap-2">
                    <span class="text-foreground font-semibold tabular-nums">{group.balance}</span>
                    <span class="text-muted-foreground text-xs">{inventoryUnitLabel(group.unit)}</span>
                    {#if group.balance === 0}
                      <StatusBadge data={{ label: 'Sem estoque' }} ui={{ tone: 'danger', size: 'sm' }} />
                    {/if}
                  </span>
                </TableCell>
                <TableCell>
                  <TicketStockLinks
                    data={{
                      links: group.ticketLinks,
                      balance: group.balance,
                      ticketsPath: '/maintenance/tickets',
                    }}
                  />
                </TableCell>
                <TableActionsCell>
                  <ActionMenu
                    data={menuOf(group)}
                    ui={{ isIconOnly: true }}
                    actions={{ onSelect: (id) => selectMenu(group, id) }}
                  />
                </TableActionsCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>

      {#if listState.isTruncated}
        <p class="text-muted-foreground text-xs">
          A lista mostra os primeiros produtos. Use a busca para achar o que falta.
        </p>
      {/if}
    </section>
  {/if}
</div>
