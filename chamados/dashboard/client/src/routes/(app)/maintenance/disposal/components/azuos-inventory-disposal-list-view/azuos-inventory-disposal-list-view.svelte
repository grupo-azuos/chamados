<!--
  @component
  O DESCARTE DA MANUTENÇÃO: o que saiu de uso, quando, quanto e por quê.

  É um REGISTRO, não um cadastro: descarte não se edita nem se apaga, porque é a prova de para onde
  foi o que não está mais na prateleira. Por isso a tela só tem um botão — "Registrar descarte".
  Tem o filtro por motivo, o resumo (descartes e unidades, que são números diferentes) e um cartão
  por descarte: o produto, a quantidade, o motivo, a observação, a data, quem registrou e quanto
  ficou no depósito. Lista cortada avisa que os mais antigos continuam guardados.

  Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando, vazia,
  filtrada sem resultado e em erro.

  - `data`: `disposals`, `total`, `units` e `filter` (o motivo).
  - `state`: `isLoading`, `isRefetching`, `isEmpty`, `isFilteredOut`, `isTruncated` e `error`.
  - `actions`: `onReasonChange`, `onClearFilters`, `onRetry` e `onRegister`.
-->
<script lang="ts" module>
  import { inventoryUnitShortLabel } from '@template/shared/domain/inventory-catalog.util';
  import {
    disposalReasonLabel,
    disposalReasonOptions,
    type DisposalReason,
  } from '@template/shared/domain/inventory-stock.util';
  import { type InventoryMovement } from '@template/shared/schemas/inventory-movement.schema';

  /**
   * O DESCARTE DA MANUTENÇÃO: o que saiu de uso, quando, quanto e por quê.
   *
   * É um REGISTRO, não um cadastro: descarte não se edita nem se apaga, porque é a prova de
   * para onde foi o que não está mais na prateleira. Por isso a tela só tem um botão — o de
   * registrar outro.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro.
   */
  export type AzuosInventoryDisposalListViewProps = {
    data: {
      disposals: InventoryMovement[];
      total: number;
      units: number;
      filter: { reason: DisposalReason | '' };
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
      onReasonChange: (reason: DisposalReason | '') => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onRegister: () => void;
    };
  };

  const REASON_FILTER_OPTIONS = disposalReasonOptions();
</script>

<script lang="ts">
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
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
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableText,
  } from '$lib/components/azuos-table/azuos-table';
  import { useCardPage } from '$lib/hooks/use-card-page/use-card-page.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { cn } from '$lib/utils/cn';
  import { formatDate } from '$lib/utils/format-date';

  let { data, state: listState, actions }: AzuosInventoryDisposalListViewProps = $props();
  /* A grade de cards pagina no navegador: a lista chega inteira (até o teto da consulta). A
     tabela rola inteira (padrão do grupo). */
  const cardPage = useCardPage(() => data.disposals);
  const tableView = useTableViewModel();

  /* "3 descartes · 7 unidades": linhas e unidades são números diferentes, e os dois importam. */
  const summary = $derived(
    `${data.total} ${data.total === 1 ? 'descarte' : 'descartes'} · ${data.units} ${
      data.units === 1 ? 'unidade' : 'unidades'
    }`,
  );

  function reasonOf(disposal: InventoryMovement): string {
    return disposal.reason ? disposalReasonLabel(disposal.reason) : 'Descarte';
  }
</script>

<div class="flex w-full flex-col gap-6">
  <PageHeader
    data={{
      title: 'Descarte',
      description: 'O que saiu de uso, e por quê: quebrou, venceu, sumiu ou não serve mais.',
    }}
  >
    <ActionButton
      data={{ label: 'Registrar descarte' }}
      ui={{ icon: Plus }}
      actions={{ onClick: actions.onRegister }}
    />
  </PageHeader>

  <!-- O cartão de filtros do grupo (o de Empresas do paralegal): os filtros à vista.
       "Limpar filtros" só aparece quando há o que limpar; quando o filtro escondeu tudo,
       quem o oferece é o aviso de lista vazia — dois botões iguais só confundem. -->
  <div class="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-4">
    <CollapsibleFilters
      data={{ label: 'Filtros dos descartes', activeCount: 0 }}
      state={{ hasFilter: data.filter.reason !== '' && !listState.isFilteredOut }}
      actions={{ onClear: actions.onClearFilters }}
    >
      {#snippet primary()}
        <FilterField ui={{ className: 'sm:w-full' }} data={{ label: 'Motivo' }}>
          <OptionPicker
            data={{ value: data.filter.reason, options: REASON_FILTER_OPTIONS }}
            ui={{ ariaLabel: 'Filtrar por motivo', allLabel: 'Todos os motivos' }}
            actions={{
              onChange: (value: string) => actions.onReasonChange(value as DisposalReason | ''),
            }}
          />
        </FilterField>
      {/snippet}
    </CollapsibleFilters>
  </div>

  <!-- A barra da lista: cards ou tabela à esquerda; à direita as páginas (cards) ou a contagem
       (tabela, que rola inteira). Carregando, vazia ou com erro, não há lista para contar. -->
  {#if !listState.isLoading && !listState.error && !listState.isEmpty}
    <ListToolbar
      data={{
        scroll: { loaded: data.disposals.length, totalItems: data.total },
        pages: { page: cardPage.page, pageSize: cardPage.pageSize, totalItems: cardPage.total },
        noun: ['descarte', 'descartes'],
      }}
      actions={{ onPageChange: cardPage.actions.onPageChange }}
    />
  {/if}

  <!-- Os estados vêm PRIMEIRO, e cada um encerra a leitura (CONTRIBUTING §2). -->
  {#if listState.error}
    <ErrorState
      data={{ message: listState.error, title: 'Não consegui carregar os descartes' }}
      state={{ isRetrying: listState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if listState.isLoading}
    <!-- O esqueleto tem a FORMA da grade: sem isso, a tela pula quando o conteúdo chega. -->
    <div class="card-grid" aria-busy="true" aria-label="Carregando os descartes" role="status">
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
    <EmptyState
      data={{
        title: 'Nenhum descarte registrado',
        description: 'Quando algo quebrar, vencer ou sumir, registre aqui para o depósito fechar.',
      }}
      ui={{ icon: Trash2 }}
    >
      <ActionButton
        data={{ label: 'Registrar descarte' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onRegister }}
      />
    </EmptyState>
  {:else if listState.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhum descarte por esse motivo',
        description: 'Tente outro motivo, ou limpe o filtro para ver todos.',
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
    <section class="flex flex-col gap-3" aria-label="Lista de descartes">
      <p class="text-muted-foreground text-xs">{summary}</p>

      <!-- 1. Cards: sempre no estreito (< xl), ou quando a pessoa pediu cards. O descarte é
           história: o cartão não abre nada nem tem ação. -->
      <div
        class={cn('card-grid', !tableView.forceCards && 'xl:hidden')}
        data-slot="inventory-disposal-cards"
      >
        {#each cardPage.items as disposal (disposal.id)}
          <ContentCard
            data={{
              label: disposal.itemName,
              title: disposal.itemName,
              meta: `Descartado em ${formatDate(disposal.createdAt)}`,
              status: disposal.reason
                ? { label: disposalReasonLabel(disposal.reason), tone: 'danger' }
                : { label: 'Descarte', tone: 'neutral' },
              metrics: [
                {
                  key: 'quantity',
                  label: 'Descartado',
                  value: `${disposal.quantity} ${inventoryUnitShortLabel(disposal.itemUnit)}`,
                  tone: 'red',
                },
                {
                  key: 'balance',
                  label: 'No depósito',
                  value: String(disposal.balanceAfter),
                  tone: 'green',
                  isOn: disposal.balanceAfter > 0,
                },
              ],
              /* Quem registrou, com o rosto (o diretório acha a foto pelo nome). */
              footer: {
                title: disposal.createdBy,
                subtitle: 'Quem registrou',
                person: { name: disposal.createdBy },
              },
            }}
            ui={{ icon: Trash2, iconTone: 'danger', slot: 'inventory-disposal-card' }}
          >
            {#snippet body()}
              {#if disposal.note}
                <p class="text-muted-foreground line-clamp-3 text-xs">{disposal.note}</p>
              {/if}
            {/snippet}
          </ContentCard>
        {/each}
      </div>
    <!-- No pé dos cards, a mesma barra de páginas: quem chegou ao último card troca de página
         sem rolar de volta. Na tabela, que rola inteira, ela não aparece. -->
    <ListToolbar
      data={{
        scroll: { loaded: data.disposals.length, totalItems: data.total },
        pages: { page: cardPage.page, pageSize: cardPage.pageSize, totalItems: cardPage.total },
        noun: ['descarte', 'descartes'],
      }}
      ui={{ position: 'bottom' }}
      actions={{ onPageChange: cardPage.actions.onPageChange }}
    />

      <!-- 2. Tabela: só quando a tela cabe (>= xl) E a pessoa não preferiu cards. Rola inteira. -->
      <div
        class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
        data-slot="inventory-disposal-table"
      >
        <Table class="min-w-[880px]">
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Descartado</TableHead>
              <TableHead>No depósito</TableHead>
              <TableHead>Quando</TableHead>
              <TableHead>Quem registrou</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each data.disposals as disposal (disposal.id)}
              <TableRow class="align-top">
                <TableCell>
                  <!-- O nome e a nota numa linha cada, cortados com "…" no teto da coluna. -->
                  <span class="text-foreground block font-medium">
                    <TableText data={{ text: disposal.itemName }} ui={{ className: 'max-w-72' }} />
                  </span>
                  {#if disposal.note}
                    <span class="text-muted-foreground block text-xs">
                      <TableText data={{ text: disposal.note }} ui={{ className: 'max-w-72' }} />
                    </span>
                  {/if}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    data={{ label: reasonOf(disposal) }}
                    ui={{ tone: disposal.reason ? 'danger' : 'neutral', size: 'sm' }}
                  />
                </TableCell>
                <TableCell class="tabular-nums">
                  {disposal.quantity} {inventoryUnitShortLabel(disposal.itemUnit)}
                </TableCell>
                <TableCell class="tabular-nums">{disposal.balanceAfter}</TableCell>
                <TableCell class="text-muted-foreground text-xs whitespace-nowrap">
                  {formatDate(disposal.createdAt)}
                </TableCell>
                <TableCell>
                  <span class="flex items-center gap-2">
                    <PersonAvatar name={disposal.createdBy} ui={{ size: 'sm' }} />
                    <TableText data={{ text: disposal.createdBy }} ui={{ className: 'max-w-36' }} />
                  </span>
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>

      {#if listState.isTruncated}
        <p class="text-muted-foreground text-xs">
          A lista mostra os descartes mais recentes. Os mais antigos continuam guardados.
        </p>
      {/if}
    </section>
  {/if}
</div>
