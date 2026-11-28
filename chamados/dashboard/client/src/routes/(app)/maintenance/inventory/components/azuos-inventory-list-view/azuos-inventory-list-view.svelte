<!--
  @component
  A tela do INVENTÁRIO da Manutenção: busca, filtros e a grade de cartões com foto de tudo o que
  existe no escritório. Cada cartão é o cartão de registro do sistema (`AzuosContentCard`) — clicar
  nele abre a correção, e editar e excluir ficam no menu de três pontinhos. Use na rota do inventário; ela não
  busca nada, só desenha o que o view-model entrega.
-->
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
  import Package from '@lucide/svelte/icons/package';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ActionMenu from '$lib/components/azuos-action-menu/azuos-action-menu.svelte';
  import ConfirmDialog from '$lib/components/azuos-confirm-dialog/azuos-confirm-dialog.svelte';
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import CollapsibleFilters from '$lib/components/azuos-collapsible-filters/azuos-collapsible-filters.svelte';
  import ListToolbar from '$lib/components/azuos-list-toolbar/azuos-list-toolbar.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
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
  import { useCardPage } from '$lib/hooks/use-card-page/use-card-page.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { cn } from '$lib/utils/cn';
  import { formatDate } from '$lib/utils/format-date';
  import { inventoryCategoryIconOf } from '$lib/utils/record-icon.util';

  let { data, state: listState, actions }: AzuosInventoryListViewProps = $props();
  /* A grade de cards pagina no navegador: a lista chega inteira (até o teto da consulta). A
     tabela rola inteira (padrão do grupo). */
  const cardPage = useCardPage(() => data.items);
  const tableView = useTableViewModel();

  const hasActiveFilter = $derived(
    data.filter.search.trim() !== '' ||
      data.filter.category !== '' ||
      data.filter.withoutPhotoOnly,
  );

  /* Editar e excluir: o mesmo menu de três pontinhos no card e na linha da tabela. */
  function menuOf(item: InventoryItem) {
    return {
      label: `Ações de ${item.name}`,
      items: [
        { id: 'edit', label: 'Editar', icon: Pencil },
        { id: 'delete', label: 'Excluir', icon: Trash2, isDestructive: true, separatorBefore: true },
      ],
    };
  }

  function selectMenu(item: InventoryItem, id: string) {
    if (id === 'delete') {
      actions.onAskDelete(item);
      return;
    }
    actions.onEdit(item);
  }

  /* A linha de baixo do cartão: onde fica e como é contado, sem repetir rótulo nenhum. */
  function detailOf(item: InventoryItem): string {
    return [item.department, item.location, inventoryUnitLabel(item.unit)]
      .filter(Boolean)
      .join(' · ');
  }

  function placeOf(item: InventoryItem): string {
    return [item.department, item.location].filter(Boolean).join(' · ') || '—';
  }
</script>

<div class="flex w-full flex-col gap-6">
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

  <!-- O cartão de filtros do grupo (o de Empresas do paralegal): a busca à vista, com o filtro principal; o resto atrás do "Filtros".
       "Limpar filtros" só aparece quando há o que limpar; quando o filtro escondeu tudo,
       quem o oferece é o aviso de lista vazia — dois botões iguais só confundem. -->
  <div class="flex flex-col gap-3">
    <CollapsibleFilters
      data={{ label: 'Filtros do inventário', activeCount: data.filter.withoutPhotoOnly ? 1 : 0 }}
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
        <FilterField ui={{ className: 'sm:w-full' }} data={{ label: 'Foto' }}>
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
      </div>
    </CollapsibleFilters>
  </div>

  <!-- A barra da lista: cards ou tabela à esquerda; à direita as páginas (cards) ou a contagem
       (tabela, que rola inteira). Carregando, vazia ou com erro, não há lista para contar. -->
  {#if !listState.isLoading && !listState.error && !listState.isEmpty}
    <ListToolbar
      data={{
        scroll: { loaded: data.items.length, totalItems: data.total },
        pages: { page: cardPage.page, pageSize: cardPage.pageSize, totalItems: cardPage.total },
        noun: ['produto', 'produtos'],
      }}
      actions={{ onPageChange: cardPage.actions.onPageChange }}
    />
  {/if}

  <!-- Os estados vêm PRIMEIRO, e cada um encerra a leitura (CONTRIBUTING §2): a lista só é
       desenhada quando sobrou lista para desenhar. -->
  {#if listState.error}
    <ErrorState
      data={{ message: listState.error, title: 'Não consegui carregar o inventário' }}
      state={{ isRetrying: listState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if listState.isLoading}
    <!-- O esqueleto tem a FORMA da grade: sem isso, a tela pula quando o conteúdo chega. -->
    <div class="card-grid" aria-busy="true" aria-label="Carregando o inventário" role="status">
      {#each Array.from({ length: 6 }, (_, index) => index) as index (index)}
        <div class="bg-card shadow-card rounded-surface flex flex-col gap-3 p-4">
          <Skeleton class="h-3 w-1/4" />
          <Skeleton class="h-4 w-2/3" />
          <Skeleton class="h-3 w-full" />
          <Skeleton class="mt-4 h-6 w-1/2" />
        </div>
      {/each}
    </div>
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
      ui={{ icon: SearchX }}
    >
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    </EmptyState>
  {:else}
    <section class="flex flex-col gap-3" aria-label="Lista do inventário">

      <!-- 1. Cards: sempre no estreito (< xl), ou quando a pessoa pediu cards no
           `TableViewToggle`. A grade pagina. -->
      <div class={cn('card-grid', !tableView.forceCards && 'xl:hidden')} data-slot="inventory-cards">
        {#each cardPage.items as item (item.id)}
          <!-- O cartão de registro do sistema: clicar em qualquer ponto abre a correção; com
               foto, ela entra pequena no lugar do ícone da categoria. Corrigir e excluir moram no
               menu de três pontinhos, nunca em ícone solto. -->
          <ContentCard
            data={{
              label: `Editar ${item.name}`,
              title: item.name,
              code: item.code,
              meta: detailOf(item),
              status: { label: inventoryCategoryLabel(item.category), tone: 'neutral' },
              tags: item.photoUrl ? [] : [{ label: 'Sem foto' }],
              footer: {
                title: item.userName ?? 'Sem responsável',
                subtitle: `Atualizado em ${formatDate(item.updatedAt ?? item.createdAt)}`,
                person: item.userName ? { id: item.userId, name: item.userName } : null,
              },
              openLabel: 'Editar',
              menu: menuOf(item),
            }}
            ui={{
              icon: inventoryCategoryIconOf(item.category),
              iconTone: 'slate',
              thumbnailUrl: item.photoUrl,
              slot: 'inventory-card',
            }}
            actions={{
              onOpen: () => actions.onEdit(item),
              onMenuSelect: (id) => selectMenu(item, id),
            }}
          >
            {#snippet notes()}
              {#if item.note}
                <p class="text-muted-foreground line-clamp-2 text-xs">{item.note}</p>
              {/if}
            {/snippet}
          </ContentCard>
        {/each}
      </div>
    <!-- No pé dos cards, a mesma barra de páginas: quem chegou ao último card troca de página
         sem rolar de volta. Na tabela, que rola inteira, ela não aparece. -->
    <ListToolbar
      data={{
        scroll: { loaded: data.items.length, totalItems: data.total },
        pages: { page: cardPage.page, pageSize: cardPage.pageSize, totalItems: cardPage.total },
        noun: ['produto', 'produtos'],
      }}
      ui={{ position: 'bottom' }}
      actions={{ onPageChange: cardPage.actions.onPageChange }}
    />

      <!-- 2. Tabela: só quando a tela cabe (>= xl) E a pessoa não preferiu cards. Rola inteira. -->
      <div
        class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
        data-slot="inventory-table"
      >
        <Table class="min-w-[880px]">
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Onde fica</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Atualizado em</TableHead>
              <TableActionsHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each data.items as item (item.id)}
              <TableRow>
                <TableCell>
                  <!-- O nome numa linha só, cortado com "…" no teto da coluna (o inteiro no balão). -->
                  <span class="text-foreground block font-medium">
                    <TableText data={{ text: item.name }} ui={{ className: 'max-w-72' }} />
                  </span>
                  {#if item.code}
                    <span class="text-muted-foreground block font-mono text-xs">{item.code}</span>
                  {/if}
                </TableCell>
                <TableCell>
                  <span class="flex flex-wrap items-center gap-1.5">
                    <StatusBadge data={{ label: inventoryCategoryLabel(item.category) }} ui={{ size: 'sm' }} />
                    {#if !item.photoUrl}
                      <StatusBadge data={{ label: 'Sem foto' }} ui={{ size: 'sm' }} />
                    {/if}
                  </span>
                </TableCell>
                <TableCell class="text-muted-foreground">
                  <TableText data={{ text: placeOf(item) }} ui={{ className: 'max-w-48' }} />
                </TableCell>
                <TableCell>
                  {#if item.userName}
                    <span class="flex items-center gap-2">
                      <PersonAvatar name={item.userName} personId={item.userId} ui={{ size: 'sm' }} />
                      <TableText data={{ text: item.userName }} ui={{ className: 'max-w-36' }} />
                    </span>
                  {:else}
                    <span class="text-muted-foreground">Sem responsável</span>
                  {/if}
                </TableCell>
                <TableCell class="text-muted-foreground text-xs whitespace-nowrap">
                  {formatDate(item.updatedAt ?? item.createdAt)}
                </TableCell>
                <TableActionsCell>
                  <ActionMenu
                    data={menuOf(item)}
                    ui={{ isIconOnly: true }}
                    actions={{ onSelect: (id) => selectMenu(item, id) }}
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

<!-- Excluir arquiva, mas some da tela: pergunta antes, com o nome do produto na frase. -->
<ConfirmDialog
  data={{
    title: 'Excluir este produto?',
    description: data.deleting
      ? `"${data.deleting.name}" sai do inventário, com a foto e o extrato guardados. Ele fica em "Removidos", onde dá para desfazer.`
      : '',
    confirmLabel: 'Excluir produto',
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
