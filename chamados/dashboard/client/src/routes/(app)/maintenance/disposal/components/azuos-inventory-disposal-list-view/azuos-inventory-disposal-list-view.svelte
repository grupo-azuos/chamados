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
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import UserRound from '@lucide/svelte/icons/user-round';

  import PaginationBar from '$lib/components/azuos-pagination-bar/azuos-pagination-bar.svelte';
  import { useCardPage } from '$lib/hooks/use-card-page/use-card-page.svelte';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
    import { formatDate } from '$lib/utils/format-date';

  let { data, state: listState, actions }: AzuosInventoryDisposalListViewProps = $props();
  /* A grade de cards pagina no navegador: a lista chega inteira (até o teto da consulta). */
  const cardPage = useCardPage(() => data.disposals);

  /* "3 descartes · 7 unidades": linhas e unidades são números diferentes, e os dois importam. */
  const summary = $derived(
    `${data.total} ${data.total === 1 ? 'descarte' : 'descartes'} · ${data.units} ${
      data.units === 1 ? 'unidade' : 'unidades'
    }`,
  );
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

  <ContentCard data={{ label: '', title: '' }}>
{#snippet body()}
<div class="flex flex-wrap items-end gap-x-4 gap-y-3 p-4">
    <FilterField data={{ label: 'Motivo' }}>
      <OptionPicker
        data={{ value: data.filter.reason, options: REASON_FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por motivo', allLabel: 'Todos os motivos' }}
        actions={{
          onChange: (value: string) => actions.onReasonChange(value as DisposalReason | ''),
        }}
      />
    </FilterField>

    {#if data.filter.reason !== ''}
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'ghost', size: 'lg' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    {/if}
  </div>
{/snippet}
</ContentCard>

  <!-- Os estados vêm PRIMEIRO, e cada um encerra a leitura (CONTRIBUTING §2). -->
  {#if listState.error}
    <ErrorState
      data={{ message: listState.error, title: 'Não consegui carregar os descartes' }}
      state={{ isRetrying: listState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if listState.isLoading}
    <p class="text-muted-foreground p-6 text-center text-sm">Carregando os descartes…</p>
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
      ui={{ icon: Trash2 }}
    >
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    </EmptyState>
  {:else}
    <section class="flex flex-col gap-3">
      <p class="text-muted-foreground text-xs">{summary}</p>

      <!-- A grade padrão de cards. O descarte é história: o cartão não abre nada nem tem ação. -->
      <div class="card-grid" data-slot="inventory-disposal-cards">
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
              footer: { title: disposal.createdBy, subtitle: 'Quem registrou' },
            }}
            ui={{ icon: Trash2, iconTone: 'danger', footerIcon: UserRound, slot: 'inventory-disposal-card' }}
          >
            {#snippet body()}
              {#if disposal.note}
                <p class="text-ink-700 line-clamp-3 text-xs">{disposal.note}</p>
              {/if}
            {/snippet}
          </ContentCard>
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
              noun: ['descarte', 'descartes'],
            }}
            actions={{ onPageChange: cardPage.actions.onPageChange }}
          />
        </div>
      {/if}

      {#if listState.isTruncated}
        <p class="text-muted-foreground text-xs">
          A lista mostra os descartes mais recentes. Os mais antigos continuam guardados.
        </p>
      {/if}
    </section>
  {/if}
</div>
