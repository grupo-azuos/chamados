<script lang="ts" module>
  import {
    inventoryCategoryLabel,
    inventoryCategoryOptions,
    inventoryUnitLabel,
  } from '@template/shared/domain/inventory-catalog.util';
  import { type InventoryCategory } from '@template/shared/domain/inventory-catalog.util';
  import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';

  /**
   * O INVENTÁRIO DA MANUTENÇÃO: o que existe no escritório, em cartões com foto.
   *
   * Cartão com imagem, e não tabela: quem cuida do escritório reconhece "aquela cadeira" pela
   * foto antes de ler o nome, e metade do cadastro é coisa que não tem nome oficial nenhum.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro — estados que, num componente que busca sozinho,
   * só apareceriam desligando o servidor.
   */
  export type InventoryListFilterValues = {
    search: string;
    category: InventoryCategory | '';
    withoutPhotoOnly: boolean;
  };

  export type AzuosInventoryListViewProps = {
    data: {
      items: InventoryItem[];
      total: number;
      filter: InventoryListFilterValues;
      /** O produto esperando confirmação de exclusão — nulo quando não há. */
      deleting: InventoryItem | null;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isTruncated: boolean;
      isDeleting?: boolean;
      error: string | null;
      deleteError?: string | null;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onCategoryChange: (category: InventoryCategory | '') => void;
      onWithoutPhotoOnlyChange: (withoutPhotoOnly: boolean) => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onRegister: () => void;
      onEdit: (item: InventoryItem) => void;
      onAskDelete: (item: InventoryItem) => void;
      onCancelDelete: () => void;
      onConfirmDelete: () => void;
    };
  };

  const CATEGORY_FILTER_OPTIONS = inventoryCategoryOptions();
</script>

<script lang="ts">
  import ImageOff from '@lucide/svelte/icons/image-off';
  import Package from '@lucide/svelte/icons/package';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ConfirmDialog from '$lib/components/azuos-confirm-dialog/azuos-confirm-dialog.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';

  let { data, state: listState, actions }: AzuosInventoryListViewProps = $props();

  const hasActiveFilter = $derived(
    data.filter.search.trim() !== '' ||
      data.filter.category !== '' ||
      data.filter.withoutPhotoOnly,
  );

  /* A linha de baixo do cartão: onde fica e como é contado, sem repetir rótulo nenhum. */
  function detailOf(item: InventoryItem): string {
    return [item.department, item.location, inventoryUnitLabel(item.unit)]
      .filter(Boolean)
      .join(' · ');
  }
</script>

<div class="flex flex-col gap-5">
  <PageHeader
    data={{
      title: 'Inventário',
      description: 'O que existe no escritório: mobiliário, mercadinho, limpeza e o resto.',
    }}
  >
    <ActionButton
      data={{ label: 'Cadastrar produto' }}
      ui={{ icon: Plus }}
      actions={{ onClick: actions.onRegister }}
    />
  </PageHeader>

  <div class="rounded-surface border-border bg-card flex flex-col gap-3 border p-4 shadow-xs">
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

      <!-- Atalho para terminar o cadastro: ela fotografa o que falta num dia só. -->
      <FilterField data={{ label: 'Foto' }}>
        <OptionPicker
          data={{
            value: data.filter.withoutPhotoOnly ? 'without' : '',
            options: [{ value: 'without', label: 'Sem foto' }],
          }}
          ui={{ ariaLabel: 'Filtrar por foto', allLabel: 'Todos' }}
          actions={{
            onChange: (value: string) => actions.onWithoutPhotoOnlyChange(value === 'without'),
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
  </div>

  <!-- Os estados vêm PRIMEIRO, e cada um encerra a leitura (CONTRIBUTING §2): a lista só é
       desenhada quando sobrou lista para desenhar. -->
  {#if listState.error}
    <ErrorState
      data={{ message: listState.error, title: 'Não consegui carregar o inventário' }}
      state={{ isRetrying: listState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if listState.isLoading}
    <p class="text-muted-foreground p-6 text-center text-sm">Carregando o inventário…</p>
  {:else if listState.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhum produto cadastrado ainda',
        description: 'Comece pelo que a Manutenção repõe toda semana: café, água, limpeza.',
      }}
      ui={{ icon: Package }}
    >
      <ActionButton
        data={{ label: 'Cadastrar produto' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onRegister }}
      />
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

      <!-- Grade que se ajusta sozinha: um cartão por linha no celular, até quatro no monitor. -->
      <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {#each data.items as item (item.id)}
          <li class="flex">
            <div
              class="group rounded-surface border-border bg-card hover:border-border-strong flex flex-1 cursor-pointer flex-row items-stretch overflow-hidden border shadow-xs transition hover:shadow-sm sm:flex-col"
              role="button"
              tabindex="0"
              aria-label={`Editar ${item.name}`}
              onclick={(e) => {
                if (e.target instanceof Element && e.target.closest('[data-card-control]')) return;
                actions.onEdit(item);
              }}
              onkeydown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  actions.onEdit(item);
                }
              }}
            >
              <div
                class="bg-muted flex w-20 shrink-0 items-center justify-center overflow-hidden sm:h-32 sm:w-full"
              >
                {#if item.photoUrl}
                  <img
                    src={item.photoUrl}
                    alt={`Foto de ${item.name}`}
                    loading="lazy"
                    class="size-full object-cover"
                  />
                {:else}
                  <ImageOff class="text-muted-foreground size-5 sm:size-6" aria-hidden="true" />
                {/if}
              </div>

              <div class="flex min-w-0 flex-1 flex-col justify-between gap-1 p-2.5 sm:gap-1.5 sm:p-3">
                <div class="flex min-w-0 flex-col gap-1">
                  <div class="flex items-start justify-between gap-2">
                    <h3 class="text-ink-900 truncate text-sm leading-tight font-semibold" title={item.name}>
                      {item.name}
                    </h3>
                    <span
                      class="rounded-chip bg-muted text-ink-700 shrink-0 px-2 py-0.5 text-xs font-medium"
                    >
                      {inventoryCategoryLabel(item.category)}
                    </span>
                  </div>

                  {#if detailOf(item)}
                    <p class="text-ink-500 truncate text-xs" title={detailOf(item)}>{detailOf(item)}</p>
                  {/if}

                  {#if item.code || item.userName}
                    <div class="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
                      {#if item.code}
                        <span class="shrink-0 font-mono font-medium text-foreground">{item.code}</span>
                      {/if}
                      {#if item.code && item.userName}
                        <span aria-hidden="true">·</span>
                      {/if}
                      {#if item.userName}
                        <span class="text-ink-700 truncate" title={item.userName}>{item.userName}</span>
                      {/if}
                    </div>
                  {/if}

                  {#if item.note}
                    <p class="text-ink-700 line-clamp-1 text-xs" title={item.note}>{item.note}</p>
                  {/if}
                </div>

                <div
                  data-card-control
                  class="flex items-center justify-end gap-1 pt-1 sm:pt-2"
                >
                  <ActionButton
                    data={{ label: 'Corrigir' }}
                    ui={{ variant: 'ghost', size: 'sm', icon: Pencil, isIconOnly: true }}
                    actions={{
                      onClick: (e?: MouseEvent) => {
                        e?.stopPropagation();
                        actions.onEdit(item);
                      },
                    }}
                  />
                  <ActionButton
                    data={{ label: 'Excluir' }}
                    ui={{ variant: 'ghost', size: 'sm', icon: Trash2, isIconOnly: true }}
                    actions={{
                      onClick: (e?: MouseEvent) => {
                        e?.stopPropagation();
                        actions.onAskDelete(item);
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </li>
        {/each}
      </ul>

      {#if listState.isTruncated}
        <p class="text-muted-foreground text-xs">
          A lista mostra os primeiros produtos. Use a busca para achar o que falta.
        </p>
      {/if}
    </section>
  {/if}
</div>

<!-- Excluir é irreversível: pergunta antes, com o nome do produto na frase. -->
<ConfirmDialog
  data={{
    title: 'Excluir produto',
    description: data.deleting
      ? `"${data.deleting.name}" sai do inventário. A foto dele também é apagada.`
      : '',
    confirmLabel: 'Excluir',
    confirmingLabel: 'Excluindo…',
  }}
  ui={{ tone: 'danger' }}
  state={{
    isOpen: data.deleting !== null,
    isConfirming: listState.isDeleting,
    error: listState.deleteError,
  }}
  actions={{ onConfirm: actions.onConfirmDelete, onCancel: actions.onCancelDelete }}
/>
