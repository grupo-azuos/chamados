<!--
  @component
  O DEPÓSITO DA MANUTENÇÃO: quanto há de cada produto, e os dois botões que mudam o número.

  São os mesmos produtos do Inventário, lidos de outro jeito: lá importa O QUE é o produto (foto,
  lugar, etiqueta), aqui importa QUANTO há. Por isso o saldo é a caixinha de número do cartão
  (`AzuosRecordCard`), com a unidade, e a foto nem aparece. Tem a busca, o filtro de categoria e o atalho
  "Sem estoque" (com quantos zeraram);
  cada cartão mostra o nome, a categoria e o lugar, os chamados ligados, o saldo com a unidade,
  "Entrada" e "Saída" — que fica apagada sem estoque, em vez de abrir um diálogo que o servidor
  recusaria. Depósito vazio é inventário vazio: o aviso leva ao Inventário.

  Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando, vazia,
  filtrada sem resultado e em erro.

  - `data`: `items`, `total`, `outOfStock` e `filter`.
  - `state`: `isLoading`, `isRefetching`, `isEmpty`, `isFilteredOut`, `isTruncated` e `error`.
  - `actions`: filtros (`onSearchChange`, `onCategoryChange`, `onOutOfStockOnlyChange`,
    `onClearFilters`), `onRetry`, `onEntry(item)`, `onExit(item)` e `onOpenInventory`.
-->
<script lang="ts" module>
  import {
    inventoryCategoryLabel,
    inventoryCategoryOptions,
    inventoryUnitLabel,
    type InventoryCategory,
  } from '@template/shared/domain/inventory-catalog.util';
  import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';

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
      items: InventoryItem[];
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
      onEntry: (item: InventoryItem) => void;
      onExit: (item: InventoryItem) => void;
      onOpenInventory: () => void;
    };
  };

  const CATEGORY_FILTER_OPTIONS = inventoryCategoryOptions();
</script>

<script lang="ts">
  import ArrowDownLeft from '@lucide/svelte/icons/arrow-down-left';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import Package from '@lucide/svelte/icons/package';

  import PaginationBar from '$lib/components/azuos-pagination-bar/azuos-pagination-bar.svelte';
  import { useCardPage } from '$lib/hooks/use-card-page/use-card-page.svelte';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import TicketStockLinks from '$lib/components/azuos-ticket-stock-links/azuos-ticket-stock-links.svelte';
  import CardSurface from '$lib/components/azuos-card-surface/azuos-card-surface.svelte';
  import RecordCard from '$lib/components/azuos-record-card/azuos-record-card.svelte';
  import { inventoryCategoryIconOf } from '$lib/utils/record-icon.util';

  let { data, state: listState, actions }: AzuosStockListViewProps = $props();
  /* A grade de cards pagina no navegador: a lista chega inteira (até o teto da consulta). */
  const cardPage = useCardPage(() => data.items);

  const hasActiveFilter = $derived(
    data.filter.search.trim() !== '' || data.filter.category !== '' || data.filter.outOfStockOnly,
  );

  /* O atalho mostra quantos zeraram: é o número que faz a pessoa clicar nele. */
  const outOfStockLabel = $derived(
    data.outOfStock > 0 ? `Sem estoque (${data.outOfStock})` : 'Sem estoque',
  );

  /* A linha de baixo do nome: categoria e lugar, sem repetir rótulo nenhum. */
  function detailOf(item: InventoryItem): string {
    return [inventoryCategoryLabel(item.category), item.location].filter(Boolean).join(' · ');
  }
</script>

<div class="flex w-full flex-col gap-6">
  <PageHeader
    data={{
      title: 'Depósito',
      description: 'Quanto há de cada produto. Entrada soma, saída tira — e o número se explica.',
    }}
  />

  <CardSurface ui={{ className: 'flex flex-col gap-3 p-4' }}>
    <TextField
      data={{
        label: 'Buscar',
        name: 'search',
        value: data.filter.search,
        placeholder: 'Nome do produto, onde fica ou código de patrimônio',
      }}
      actions={{ onChange: actions.onSearchChange }}
    />

    <div class="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-4">
      <FilterField data={{ label: 'Categoria' }}>
        <OptionPicker
          data={{ value: data.filter.category, options: CATEGORY_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por categoria', allLabel: 'Todas as categorias' }}
          actions={{
            onChange: (value: string) => actions.onCategoryChange(value as InventoryCategory | ''),
          }}
        />
      </FilterField>

      <!-- A lista de compras da semana: só o que zerou. -->
      <FilterField data={{ label: 'Estoque' }}>
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

      {#if hasActiveFilter}
        <ActionButton
          data={{ label: 'Limpar filtros' }}
          ui={{ variant: 'ghost', size: 'lg' }}
          actions={{ onClick: actions.onClearFilters }}
        />
      {/if}
    </div>
  </CardSurface>

  <!-- Os estados vêm PRIMEIRO, e cada um encerra a leitura (CONTRIBUTING §2). -->
  {#if listState.error}
    <ErrorState
      data={{ message: listState.error, title: 'Não consegui carregar o depósito' }}
      state={{ isRetrying: listState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if listState.isLoading}
    <p class="text-muted-foreground p-6 text-center text-sm">Carregando o depósito…</p>
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
      ui={{ icon: Package }}
    >
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    </EmptyState>
  {:else}
    <section class="flex flex-col gap-3">
      <p class="text-muted-foreground text-xs">
        {data.total}
        {data.total === 1 ? 'produto' : 'produtos'}
      </p>

      <!-- A grade padrão de cards (`card-grid`). O depósito não tem ficha: o cartão não abre nada,
           e as ações (Entrada, Saída) moram no rodapé. -->
      <div class="card-grid" data-slot="stock-cards">
        {#each cardPage.items as item (item.id)}
          <RecordCard
            data={{
              label: item.name,
              title: item.name,
              code: item.code,
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
          </RecordCard>
        {/each}
      </div>
      <!-- A grade de cards pagina (a tabela rola inteira): doze por página, sem buraco na última
           fileira. A barra só aparece quando há mais de uma página. -->
      {#if cardPage.total > cardPage.pageSize}
        <div class="flex justify-center">
          <PaginationBar
            data={{
              page: cardPage.page,
              pageSize: cardPage.pageSize,
              total: cardPage.total,
              noun: ['produto', 'produtos'],
            }}
            actions={{ onPageChange: cardPage.actions.onPageChange }}
          />
        </div>
      {/if}

      {#if listState.isTruncated}
        <p class="text-muted-foreground text-xs">
          A lista mostra os primeiros produtos. Use a busca para achar o que falta.
        </p>
      {/if}
    </section>
  {/if}
</div>
