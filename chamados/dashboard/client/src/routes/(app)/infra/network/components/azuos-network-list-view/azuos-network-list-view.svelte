<!--
  @component
  A REDE: quedas e instabilidade do link de internet, como o UniFi avisou.

  No alto, os números: em aberto agora e quedas no período (atalhos que ligam o filtro), o tempo
  fora do ar e a pior latência. Depois, os filtros (tipo de aviso, gravidade, andamento e período de
  7, 30 ou 90 dias) e a alternância entre cards (celular) e tabela (monitor). Cada evento mostra a
  gravidade, o tipo, quando foi, quanto durou (ou "Em aberto"), as medidas que vieram e o botão de
  marcar como resolvido ou reabrir.

  **O silêncio não é notícia boa.** O que não chegou aqui não aconteceu para esta tela. Por isso o
  estado vazio diz de onde vêm os eventos, em vez de afirmar que a rede está bem.

  Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando, vazia,
  com a internet fora agora e com o mês inteiro em ordem.

  - `data`: `events`, `total`, `summary` e `filter`.
  - `state`: `isLoading`, `isRefetching`, `isEmpty`, `isFilteredOut`, `isTruncated`,
    `isSummaryLoading`, `isSaving`, `error` e `actionError`.
  - `actions`: filtros (`onTypeChange`, `onSeverityChange`, `onOnlyOpenChange`, `onPeriodChange`,
    `onClearFilters`), `onRetry` e `onResolveChange(event, isResolved)`.
-->
<script lang="ts" module>
  import {
    NETWORK_EVENT_TYPES,
    NETWORK_EVENT_TYPE_LABELS,
    NETWORK_SEVERITIES,
    NETWORK_SEVERITY_LABELS,
    networkEventTypeLabel,
    networkSeverityLabel,
    networkSeverityTone,
    outageDurationSeconds,
    type NetworkEventType,
    type NetworkSeverity,
  } from '@template/shared/domain/network-event.util';
  import {
    type NetworkEvent,
    type NetworkSummary,
  } from '@template/shared/schemas/network-event.schema';

  import { formatDuration } from '$lib/utils/format-machine';

  export type NetworkFilter = {
    type: NetworkEventType | '';
    severity: NetworkSeverity | '';
    onlyOpen: boolean;
    days: number;
  };

  /**
   * A REDE: quedas e instabilidade do link de internet.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, com a internet fora agora e com o mês inteiro em ordem.
   *
   * **O silêncio não é notícia boa.** Esta tela mostra o que o UniFi avisou; o que não chegou
   * aqui não aconteceu para ela. Por isso o estado vazio diz de onde vêm os eventos, em vez
   * de afirmar que a rede está bem.
   */
  export type AzuosNetworkListViewProps = {
    data: {
      events: NetworkEvent[];
      total: number;
      summary: NetworkSummary | null;
      filter: NetworkFilter;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isTruncated: boolean;
      isSummaryLoading?: boolean;
      isSaving?: boolean;
      error: string | null;
      actionError?: string | null;
    };
    actions: {
      onTypeChange: (type: NetworkEventType | '') => void;
      onSeverityChange: (severity: NetworkSeverity | '') => void;
      onOnlyOpenChange: (onlyOpen: boolean) => void;
      onPeriodChange: (days: number) => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onResolveChange: (event: NetworkEvent, isResolved: boolean) => void;
    };
  };

  const TYPE_FILTER_OPTIONS = NETWORK_EVENT_TYPES.map((type) => ({
    value: type,
    label: NETWORK_EVENT_TYPE_LABELS[type],
  }));

  const SEVERITY_FILTER_OPTIONS = NETWORK_SEVERITIES.map((severity) => ({
    value: severity,
    label: NETWORK_SEVERITY_LABELS[severity],
    tone: networkSeverityTone(severity),
  }));

  const PERIOD_OPTIONS = [7, 30, 90].map((days) => ({
    value: String(days),
    label: `Últimos ${days} dias`,
  }));

  /** "Andamento": a opção sem valor ("Todos") vem do `allLabel` do seletor. */
  const ONLY_OPEN_OPTIONS = [{ value: 'yes', label: 'Só em aberto' }];

  /** O tipo de aviso que o cartão "Quedas no período" conta (a queda do link de internet). */
  const OUTAGE_TYPE: NetworkEventType = 'wan_down';

  /** Quanto durou, em palavras — ou que ainda está acontecendo. */
  export function durationLabelOf(event: NetworkEvent): string {
    const seconds = outageDurationSeconds(event.occurredAt, event.resolvedAt);

    return seconds === null ? 'Em aberto' : formatDuration(seconds);
  }

  /** As medidas que vieram, em uma linha. Vazio quando o aviso não trouxe número nenhum. */
  export function measuresOf(event: NetworkEvent): string {
    const parts: string[] = [];

    if (event.latencyMs !== null) parts.push(`${Math.round(event.latencyMs)} ms`);
    if (event.packetLossPercent !== null) {
      parts.push(`${event.packetLossPercent.toFixed(1).replace('.', ',')}% de perda`);
    }

    return parts.join(' · ');
  }
</script>

<script lang="ts">
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
  import type { LucideIcon } from '@lucide/svelte';
  import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
  import Clock from '@lucide/svelte/icons/clock';
  import FilterX from '@lucide/svelte/icons/filter-x';
  import Gauge from '@lucide/svelte/icons/gauge';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Timer from '@lucide/svelte/icons/timer';
  import Unplug from '@lucide/svelte/icons/unplug';
  import Wifi from '@lucide/svelte/icons/wifi';
  import WifiOff from '@lucide/svelte/icons/wifi-off';

  import PaginationBar from '$lib/components/azuos-pagination-bar/azuos-pagination-bar.svelte';
  import { useCardPage } from '$lib/hooks/use-card-page/use-card-page.svelte';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
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
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { cn } from '$lib/utils/cn';
  import { formatDateTime } from '$lib/utils/format-date';

  let { data, state: viewState, actions }: AzuosNetworkListViewProps = $props();
  /* A grade de cards pagina no navegador: a lista chega inteira (até o teto da consulta). */
  const cardPage = useCardPage(() => data.events);

  /* O desenho de cada aviso no ícone cheio do card. */
  const NETWORK_TYPE_ICONS: Record<string, LucideIcon> = {
    wan_down: WifiOff,
    wan_up: Wifi,
    failover: ArrowLeftRight,
    high_latency: Timer,
    packet_loss: Unplug,
    other: Gauge,
  };

  const summary = $derived(data.summary);
  const tableView = useTableViewModel();

  const hasActiveFilter = $derived(
    Boolean(data.filter.type || data.filter.severity || data.filter.onlyOpen),
  );

  /* Quem clica num cartão do topo precisa VER o resultado: a tela rola até os filtros. A
     referência só é usada dentro do clique, então é uma variável comum. */
  let filtersElement: HTMLElement | null = null;

  function applyShortcut(change: () => void) {
    change();

    const prefersLessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    filtersElement?.scrollIntoView?.({
      behavior: prefersLessMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }
</script>

<div class="flex w-full flex-col gap-6">
  <PageHeader
    data={{ title: 'Rede', description: 'Quedas e instabilidade do link de internet.' }}
  >
    <OptionPicker
      data={{ value: String(data.filter.days), options: PERIOD_OPTIONS }}
      ui={{ ariaLabel: 'Período' }}
      actions={{ onChange: (value: string) => actions.onPeriodChange(Number(value)) }}
    />
  </PageHeader>

  <StatCardGrid>
    <!-- Estes dois são ATALHOS de filtro: "Em aberto agora" liga "só em aberto", e "Quedas no
         período" filtra pelo tipo de aviso de queda (o mesmo que o número conta). Clicar de
         novo desliga. Os outros dois são medidas, sem filtro correspondente. -->
    <ContentCard data={{ label: 'Em aberto agora', title: 'Em aberto agora', highlight: { value: summary?.open ?? 0 } }} ui={{ icon: WifiOff, iconTone: 'danger' }} state={{ isLoading: viewState.isSummaryLoading, isSelected: data.filter.onlyOpen }} actions={{ onOpen: () => applyShortcut(() => actions.onOnlyOpenChange(!data.filter.onlyOpen)) }} />
    <ContentCard data={{ label: 'Quedas no período', title: 'Quedas no período', highlight: { value: summary?.outages ?? 0 } }} ui={{ icon: Unplug, iconTone: 'warning' }} state={{ isLoading: viewState.isSummaryLoading, isSelected: data.filter.type === OUTAGE_TYPE }} actions={{ onOpen: () =>
          applyShortcut(() =>
            actions.onTypeChange(data.filter.type === OUTAGE_TYPE ? '' : OUTAGE_TYPE),
          ) }} />
    <ContentCard data={{ label: 'Tempo fora do ar', title: 'Tempo fora do ar', highlight: { value: formatDuration(summary?.totalOutageSeconds ?? null), hint: 'somando as quedas que já terminaram' } }} ui={{ icon: Timer, iconTone: 'info' }} state={{ isLoading: viewState.isSummaryLoading }} />
    <ContentCard data={{ label: 'Pior latência', title: 'Pior latência', highlight: { value: summary?.worstLatencyMs ? `${Math.round(summary.worstLatencyMs)} ms` : '—', hint: summary?.worstPacketLossPercent
          ? `${summary.worstPacketLossPercent.toFixed(1).replace('.', ',')}% de perda no pior momento`
          : null } }} ui={{ icon: Gauge, iconTone: 'brand' }} state={{ isLoading: viewState.isSummaryLoading }} />
  </StatCardGrid>

  <!-- A falha de uma AÇÃO fica na tela, em vermelho, até resolver (CONTRIBUTING §15). -->
  {#if viewState.actionError}
    <ErrorState data={{ title: 'Não consegui salvar', message: viewState.actionError }} />
  {/if}

  <!-- Uma fileira, cada filtro com o nome em cima. "Andamento" era uma caixa de seleção solta
       embaixo dos outros; agora é um filtro como os demais, com as duas escolhas à vista. -->
  <div bind:this={filtersElement} class="flex scroll-mt-4 flex-wrap items-end gap-x-4 gap-y-3">
    <FilterField data={{ label: 'Tipo de aviso' }}>
      <OptionPicker
        data={{ value: data.filter.type, options: TYPE_FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por tipo de aviso', allLabel: 'Todos os avisos' }}
        actions={{ onChange: (value: string) => actions.onTypeChange(value as NetworkEventType | '') }}
      />
    </FilterField>
    <FilterField data={{ label: 'Gravidade' }}>
      <OptionPicker
        data={{ value: data.filter.severity, options: SEVERITY_FILTER_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por gravidade', allLabel: 'Qualquer gravidade' }}
        actions={{
          onChange: (value: string) => actions.onSeverityChange(value as NetworkSeverity | ''),
        }}
      />
    </FilterField>
    <FilterField data={{ label: 'Andamento' }}>
      <OptionPicker
        data={{ value: data.filter.onlyOpen ? 'yes' : '', options: ONLY_OPEN_OPTIONS }}
        ui={{ ariaLabel: 'Filtrar por andamento', allLabel: 'Todos' }}
        actions={{ onChange: (value: string) => actions.onOnlyOpenChange(value === 'yes') }}
      />
    </FilterField>

    <!-- Só aparece quando há o que limpar. Quando o filtro escondeu tudo, quem oferece a
         limpeza é o aviso de lista vazia, logo abaixo — dois botões iguais só confundem. O
         período (no cabeçalho) não conta: ele é o recorte da tela, não um filtro da lista. -->
    <div class="flex flex-wrap items-center gap-2 sm:ml-auto">
      {#if hasActiveFilter && !viewState.isFilteredOut}
        <ActionButton
          data={{ label: 'Limpar filtros' }}
          ui={{ variant: 'ghost', size: 'lg', icon: FilterX }}
          actions={{ onClick: actions.onClearFilters }}
        />
      {/if}
      <!-- Trocar entre tabela e cards age sobre a lista logo abaixo: mora aqui, e não no
           cabeçalho da página. -->
      <TableViewToggle />
    </div>
  </div>

  <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
  {#if viewState.error}
    <ErrorState
      data={{ title: 'Não consegui carregar os eventos de rede', message: viewState.error }}
      state={{ isRetrying: viewState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if viewState.isLoading}
    <!-- O esqueleto tem a forma da grade de cards: a tela não pula quando a lista chega. -->
    <div role="status" aria-label="Carregando os eventos…" aria-busy="true" class="card-grid">
      {#each [0, 1, 2, 3, 4, 5] as slot (slot)}
        <Skeleton class="rounded-surface h-52 w-full" />
      {/each}
    </div>
  {:else if viewState.isEmpty}
    <!-- O silêncio não é notícia boa: o texto diz DE ONDE os eventos vêm. -->
    <EmptyState
      data={{
        title: 'Nenhum evento no período',
        description:
          'Os avisos chegam do UniFi, pelo endereço de webhook configurado nele. Se a internet caiu e nada apareceu aqui, vale conferir essa configuração — ou registrar a queda à mão.',
      }}
      ui={{ icon: Wifi }}
    />
  {:else if viewState.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhum evento com esses filtros',
        description: 'Tente limpar os filtros para ver tudo o que aconteceu no período.',
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
      data-slot="network-cards-mobile"
    >
      {#each cardPage.items as event (event.id)}
        <!-- O cartão de registro do sistema. O evento não tem ficha: o card não abre nada, e o
             botão de resolver (ou reabrir) mora no rodapé. -->
        <ContentCard
          data={{
            label: `${networkEventTypeLabel(event.type)} — ${event.title}`,
            title: networkEventTypeLabel(event.type),
            meta: event.title,
            status: { label: networkSeverityLabel(event.severity), tone: networkSeverityTone(event.severity) },
            tags: event.resolvedAt
              ? [{ label: durationLabelOf(event) }]
              : [{ label: 'Em aberto', tone: 'danger' }],
            metrics: [
              { key: 'link', label: 'Link', value: event.linkName ?? '—', isText: true },
              { key: 'measures', label: 'Medidas', value: measuresOf(event) || '—', isText: true },
            ],
            footer: { title: formatDateTime(event.occurredAt) },
          }}
          ui={{
            icon: NETWORK_TYPE_ICONS[event.type] ?? Wifi,
            iconTone: networkSeverityTone(event.severity),
            footerIcon: Clock,
            slot: 'network-card',
          }}
        >
          {#snippet body()}
            {#if event.message}
              <p class="text-muted-foreground line-clamp-2 text-xs break-words">{event.message}</p>
            {/if}
          {/snippet}
          {#snippet footerActions()}
            {#if event.resolvedAt}
              <ActionButton
                data={{ label: 'Reabrir' }}
                ui={{ variant: 'secondary', size: 'sm' }}
                state={{ isDisabled: viewState.isSaving }}
                actions={{ onClick: () => actions.onResolveChange(event, false) }}
              />
            {:else}
              <ActionButton
                data={{ label: 'Resolver' }}
                ui={{ variant: 'secondary', size: 'sm' }}
                state={{ isDisabled: viewState.isSaving }}
                actions={{ onClick: () => actions.onResolveChange(event, true) }}
              />
            {/if}
          {/snippet}
        </ContentCard>
      {/each}
      <!-- Legenda da lista, não um cartão: ocupa a linha inteira embaixo da grade. -->
      <div class="text-muted-foreground col-span-full flex justify-between px-1 text-xs">
        <span>Monitoramento de instabilidade de rede e link</span>
        <span>{data.events.length} evento(s)</span>
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
              noun: ['evento', 'eventos'],
            }}
            actions={{ onPageChange: cardPage.actions.onPageChange }}
          />
        </div>
      {/if}

    <!-- Tabela para desktop (>= xl) -->
    <div
      class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
      data-slot="network-table-desktop"
    >
      <Table class="min-w-[820px]">
        <TableHeader>
          <TableRow>
            <TableHead>Quando</TableHead>
            <TableHead>O que houve</TableHead>
            <TableHead>Link</TableHead>
            <TableHead>Medidas</TableHead>
            <TableHead>Durou</TableHead>
            <TableHead class="text-right"><span class="sr-only">Ações</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.events as event (event.id)}
            <TableRow class="align-top">
              <TableCell class="text-ink-500 whitespace-nowrap text-xs">
                {formatDateTime(event.occurredAt)}
              </TableCell>
              <TableCell class="max-w-[320px]">
                <div class="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    data={{ label: networkSeverityLabel(event.severity) }}
                    ui={{ tone: networkSeverityTone(event.severity), size: 'sm' }}
                  />
                  <span class="font-medium text-ink-900 break-words">
                    {networkEventTypeLabel(event.type)}
                  </span>
                </div>
                <span class="text-ink-500 block text-xs break-words">{event.title}</span>
                {#if event.message}
                  <span class="text-ink-500 block text-xs break-words">{event.message}</span>
                {/if}
              </TableCell>
              <TableCell class="text-ink-700 break-words">{event.linkName ?? '—'}</TableCell>
              <TableCell class="text-ink-700 whitespace-nowrap text-xs">{measuresOf(event) || '—'}</TableCell>
              <TableCell>
                {#if event.resolvedAt}
                  <span class="text-ink-700 text-xs">{durationLabelOf(event)}</span>
                {:else}
                  <StatusBadge data={{ label: 'Em aberto' }} ui={{ tone: 'danger', size: 'sm' }} />
                {/if}
              </TableCell>
              <TableCell class="text-right whitespace-nowrap">
                <TableActions>
                  {#if event.resolvedAt}
                    <ActionButton
                      data={{ label: 'Reabrir' }}
                      ui={{ variant: 'ghost', size: 'sm' }}
                      state={{ isDisabled: viewState.isSaving }}
                      actions={{ onClick: () => actions.onResolveChange(event, false) }}
                    />
                  {:else}
                    <ActionButton
                      data={{ label: 'Marcar como resolvido' }}
                      ui={{ variant: 'secondary', size: 'sm' }}
                      state={{ isDisabled: viewState.isSaving }}
                      actions={{ onClick: () => actions.onResolveChange(event, true) }}
                    />
                  {/if}
                </TableActions>
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
        {#snippet footer()}
          <span>Monitoramento de instabilidade de rede e link</span>
          <span>{data.events.length} evento(s)</span>
        {/snippet}
      </Table>
    </div>

    <!-- Truncar calado é mentir sobre o tamanho do histórico. -->
    {#if viewState.isTruncated}
      <p class="text-ink-500 text-xs">
        Mostrando {data.events.length} de {data.total} eventos. Use os filtros para chegar ao que
        procura.
      </p>
    {/if}
  {/if}
</div>
