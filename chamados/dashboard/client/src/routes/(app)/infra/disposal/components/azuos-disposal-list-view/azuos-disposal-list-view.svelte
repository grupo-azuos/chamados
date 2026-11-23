<!--
  @component
  O DESCARTE: as máquinas que saíram de uso, e o motivo de cada uma.

  No alto, os números: o total fora de uso e os atalhos "Com defeito" e "Lixo", que ligam (e
  desligam) o mesmo filtro de tipo e rolam a tela até a lista. Depois, busca, tipo de descarte e a
  alternância entre cards (celular) e tabela (monitor). Cada máquina mostra o nome, o departamento,
  o tipo, o motivo, a data em que saiu, "Ver ficha" e "Voltar ao inventário" — que pergunta antes e
  apaga só o motivo do descarte, com o histórico inteiro.

  Aqui não se descarta nada — isso acontece na FICHA da máquina, que é onde a pessoa está olhando
  quando decide. Esta tela é o histórico, e a única escrita dela é desfazer.

  Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando, vazia,
  filtrada sem resultado e em erro.

  - `data`: `computers`, `total`, `summary`, `filter` e `restoring` (a que espera confirmação).
  - `state`: `isLoading`, `isRefetching`, `isEmpty`, `isFilteredOut`, `isRestoring`, `error` e
    `actionError`.
  - `actions`: filtros (`onSearchChange`, `onTypeChange`, `onClearFilters`), `onRetry`,
    `onOpenMachine` e a devolução (`onAskRestore`, `onCancelRestore`, `onConfirmRestore`).
-->
<script lang="ts" module>
  import { computerDepartmentLabel } from '$lib/utils/computer-place.util';
  import {
    DISPOSAL_TYPES,
    DISPOSAL_TYPE_LABELS,
    disposalTypeLabel,
    disposalTypeTone,
    type DisposalType,
  } from '@template/shared/domain/disposal.util';
  import { type Computer } from '@template/shared/schemas/computer.schema';

  export type DisposalFilter = { search: string; type: DisposalType | '' };

  export type DisposalSummary = { total: number; defect: number; scrap: number };

  /**
   * O DESCARTE: as máquinas que saíram de uso, e o motivo de cada uma.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro.
   *
   * Aqui não se descarta nada — isso acontece na FICHA da máquina, que é onde a pessoa está
   * olhando quando decide. Esta tela é o histórico, e a única escrita dela é desfazer.
   */
  export type AzuosDisposalListViewProps = {
    data: {
      computers: Computer[];
      total: number;
      summary: DisposalSummary;
      filter: DisposalFilter;
      restoring: Computer | null;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isRestoring?: boolean;
      error: string | null;
      actionError?: string | null;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onTypeChange: (type: DisposalType | '') => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onOpenMachine: (computer: Computer) => void;
      onAskRestore: (computer: Computer) => void;
      onCancelRestore: () => void;
      onConfirmRestore: () => void;
    };
  };

  const TYPE_FILTER_OPTIONS = DISPOSAL_TYPES.map((type) => ({
    value: type,
    label: DISPOSAL_TYPE_LABELS[type],
    tone: disposalTypeTone(type),
  }));

  /** O nome que a pessoa reconhece: o apelido ganha do nome técnico da máquina. */
  export function machineLabelOf(computer: Computer): string {
    return computer.displayName?.trim() || computer.hardware?.hostname?.trim() || computer.name;
  }
</script>

<script lang="ts">
  import Archive from '@lucide/svelte/icons/archive';
  import Clock from '@lucide/svelte/icons/clock';
  import MonitorOff from '@lucide/svelte/icons/monitor-off';
  import FilterX from '@lucide/svelte/icons/filter-x';
  import Recycle from '@lucide/svelte/icons/recycle';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Undo2 from '@lucide/svelte/icons/undo-2';
  import Wrench from '@lucide/svelte/icons/wrench';

  import PaginationBar from '$lib/components/azuos-pagination-bar/azuos-pagination-bar.svelte';
  import { useCardPage } from '$lib/hooks/use-card-page/use-card-page.svelte';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ConfirmDialog from '$lib/components/azuos-confirm-dialog/azuos-confirm-dialog.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import StatCard from '$lib/components/azuos-stat-card/azuos-stat-card.svelte';
  import StatCardGrid from '$lib/components/azuos-stat-card-grid/azuos-stat-card-grid.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import TableViewToggle from '$lib/components/azuos-table-view-toggle/azuos-table-view-toggle.svelte';
  import {
    Table,
    TableActions,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/azuos-table/azuos-table';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import RecordCard from '$lib/components/azuos-record-card/azuos-record-card.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { cn } from '$lib/utils/cn';
  import { formatDate } from '$lib/utils/format-date';

  let { data, state: viewState, actions }: AzuosDisposalListViewProps = $props();
  /* A grade de cards pagina no navegador: a lista chega inteira (até o teto da consulta). */
  const cardPage = useCardPage(() => data.computers);

  const tableView = useTableViewModel();

  const hasActiveFilter = $derived(Boolean(data.filter.search || data.filter.type));

  /* Quem clica num cartão do topo precisa VER o resultado: a tela rola até os filtros. A
     referência só é usada dentro do clique, então é uma variável comum. */
  let filtersElement: HTMLElement | null = null;

  function filterByType(type: DisposalType) {
    actions.onTypeChange(data.filter.type === type ? '' : type);

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
      title: 'Descarte',
      description: 'As máquinas que saíram de uso, e o motivo de cada uma.',
    }}
  />

  <!-- "Com defeito" e "Lixo" são ATALHOS do filtro de tipo: clicar liga o mesmo filtro das
       pastilhas, clicar de novo desliga. "Máquinas fora de uso" é o total — não filtra nada. -->
  <StatCardGrid>
    <StatCard
      data={{ label: 'Máquinas fora de uso', value: data.summary.total }}
      ui={{ tone: 'neutral', icon: Archive }}
    />
    <StatCard
      data={{
        label: 'Com defeito',
        value: data.summary.defect,
        hint: 'ainda rendem peça ou conserto',
      }}
      ui={{ tone: 'warning', icon: Wrench }}
      state={{ isSelected: data.filter.type === 'defect' }}
      actions={{ onClick: () => filterByType('defect') }}
    />
    <StatCard
      data={{ label: 'Lixo', value: data.summary.scrap, hint: 'não ligam mais' }}
      ui={{ tone: 'neutral', icon: Recycle }}
      state={{ isSelected: data.filter.type === 'scrap' }}
      actions={{ onClick: () => filterByType('scrap') }}
    />
  </StatCardGrid>

  <!-- A falha de uma AÇÃO fica na tela, em vermelho, até resolver (CONTRIBUTING §15). -->
  {#if viewState.actionError}
    <ErrorState
      data={{ title: 'Não consegui devolver ao inventário', message: viewState.actionError }}
    />
  {/if}

  <div bind:this={filtersElement} class="flex scroll-mt-4 flex-col gap-3">
    <TextField
      data={{
        label: 'Buscar',
        name: 'search',
        value: data.filter.search,
        placeholder: 'Nome da máquina, apelido ou responsável',
      }}
      actions={{ onChange: actions.onSearchChange }}
    />

    <!-- O filtro com o nome em cima e, à direita, o que age sobre a lista logo abaixo: limpar
         os filtros e trocar entre tabela e cards. -->
    <div class="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-4">
      <FilterField data={{ label: 'Tipo de descarte' }}>
        <OptionPicker
          data={{ value: data.filter.type, options: TYPE_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por tipo de descarte', allLabel: 'Com defeito e lixo' }}
          actions={{
            onChange: (value: string) => actions.onTypeChange(value as DisposalType | ''),
          }}
        />
      </FilterField>

      <div class="flex flex-wrap items-center gap-2 sm:ml-auto">
        {#if hasActiveFilter && !viewState.isFilteredOut}
          <ActionButton
            data={{ label: 'Limpar filtros' }}
            ui={{ variant: 'ghost', size: 'lg', icon: FilterX }}
            actions={{ onClick: actions.onClearFilters }}
          />
        {/if}
        <TableViewToggle />
      </div>
    </div>
  </div>

  <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
  {#if viewState.error}
    <ErrorState
      data={{ title: 'Não consegui carregar o descarte', message: viewState.error }}
      state={{ isRetrying: viewState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if viewState.isLoading}
    <p class="text-ink-500 py-10 text-center text-sm">Carregando o que saiu de uso…</p>
  {:else if viewState.isEmpty}
    <!-- Nada descartado é uma boa notícia, e o texto diz onde a ação acontece. -->
    <EmptyState
      data={{
        title: 'Nenhuma máquina descartada',
        description:
          'Quando um computador sair de uso, descarte ele pela ficha dele, no Inventário — com o motivo. Ele aparece aqui, sem perder o histórico.',
      }}
      ui={{ icon: Trash2 }}
    />
  {:else if viewState.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhuma máquina com esses filtros',
        description: 'Tente limpar os filtros para ver tudo o que saiu de uso.',
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
      data-slot="disposal-cards-mobile"
    >
      {#each cardPage.items as computer (computer.id)}
        <!-- O cartão de registro do sistema: o card inteiro abre a ficha; "Voltar ao inventário"
             mora no menu, e pergunta antes. -->
        <RecordCard
          data={{
            label: `Ver ficha de ${machineLabelOf(computer)}`,
            title: machineLabelOf(computer),
            code: computer.hardware?.hostname || computer.name,
            meta: computer.departmentId ? computerDepartmentLabel(computer) : null,
            status: computer.disposalType
              ? { label: disposalTypeLabel(computer.disposalType), tone: disposalTypeTone(computer.disposalType) }
              : { label: 'Fora de uso', tone: 'neutral' },
            footer: { title: `Saiu em ${formatDate(computer.disposedAt)}` },
            openLabel: 'Ver ficha',
            menu: {
              label: `Ações de ${machineLabelOf(computer)}`,
              items: [{ id: 'restore', label: 'Voltar ao inventário', icon: Undo2 }],
            },
          }}
          ui={{
            icon: MonitorOff,
            iconTone: computer.disposalType ? disposalTypeTone(computer.disposalType) : 'slate',
            footerIcon: Clock,
            slot: 'disposal-card',
          }}
          actions={{
            onOpen: () => actions.onOpenMachine(computer),
            onMenuSelect: () => actions.onAskRestore(computer),
          }}
        >
          {#snippet notes()}
            <span class="text-muted-foreground text-xs">Motivo</span>
            <p class="text-ink-700 line-clamp-3 text-xs break-words" title={computer.disposalReason ?? undefined}>
              {computer.disposalReason ?? '—'}
            </p>
          {/snippet}
        </RecordCard>
      {/each}
      <!-- Legenda da lista, não um cartão: ocupa a linha inteira embaixo da grade. -->
      <div class="text-muted-foreground col-span-full flex justify-between px-1 text-xs">
        <span>Máquinas baixadas e arquivadas</span>
        <span>{data.computers.length} registro(s)</span>
      </div>
    </div>
      <!-- A grade de cards pagina (a tabela rola inteira): doze por página, sem buraco na última
           fileira. A barra só aparece quando há mais de uma página. -->
      {#if cardPage.total > cardPage.pageSize}
        <div class={cn('flex justify-center', !tableView.forceCards && 'xl:hidden')}>
          <PaginationBar
            data={{
              page: cardPage.page,
              pageSize: cardPage.pageSize,
              total: cardPage.total,
              noun: ['máquina', 'máquinas'],
            }}
            actions={{ onPageChange: cardPage.actions.onPageChange }}
          />
        </div>
      {/if}

    <!-- Tabela para desktop (>= xl) -->
    <div
      class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
      data-slot="disposal-table-desktop"
    >
      <Table class="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead>Máquina</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Saiu em</TableHead>
            <TableHead class="text-right"><span class="sr-only">Ações</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.computers as computer (computer.id)}
            <TableRow class="align-top">
              <TableCell class="max-w-[240px]">
                <span class="font-medium text-ink-900 break-words">
                  {machineLabelOf(computer)}
                </span>
                <span class="block text-xs text-ink-500 break-words">
                  {computer.hardware?.hostname || computer.name}
                  {#if computer.departmentId}
                    · {computerDepartmentLabel(computer)}
                  {/if}
                </span>
              </TableCell>
              <TableCell>
                {#if computer.disposalType}
                  <StatusBadge
                    data={{ label: disposalTypeLabel(computer.disposalType) }}
                    ui={{ tone: disposalTypeTone(computer.disposalType), size: 'sm' }}
                  />
                {/if}
              </TableCell>
              <TableCell class="text-ink-700 max-w-[320px] break-words whitespace-normal">
                {computer.disposalReason ?? '—'}
              </TableCell>
              <TableCell class="text-ink-500 whitespace-nowrap text-xs">
                {formatDate(computer.disposedAt)}
              </TableCell>
              <TableCell class="text-right whitespace-nowrap">
                <TableActions>
                  <ActionButton
                    data={{ label: 'Ver ficha' }}
                    ui={{ variant: 'secondary', size: 'sm' }}
                    actions={{ onClick: () => actions.onOpenMachine(computer) }}
                  />
                  <ActionButton
                    data={{ label: 'Voltar ao inventário' }}
                    ui={{ variant: 'ghost', size: 'sm' }}
                    actions={{ onClick: () => actions.onAskRestore(computer) }}
                  />
                </TableActions>
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
        {#snippet footer()}
          <span>Máquinas baixadas e arquivadas</span>
          <span>{data.computers.length} registro(s)</span>
        {/snippet}
      </Table>
    </div>
  {/if}
</div>

<ConfirmDialog
  data={{
    title: 'Devolver esta máquina ao inventário?',
    description: data.restoring
      ? `${machineLabelOf(data.restoring)} volta para as listas do dia a dia, e o motivo do descarte é apagado. O histórico dela continua inteiro.`
      : '',
    confirmLabel: 'Voltar ao inventário',
    confirmingLabel: 'Devolvendo…',
  }}
  state={{
    isOpen: data.restoring !== null,
    isConfirming: viewState.isRestoring,
    error: viewState.actionError,
  }}
  actions={{ onConfirm: actions.onConfirmRestore, onCancel: actions.onCancelRestore }}
/>
