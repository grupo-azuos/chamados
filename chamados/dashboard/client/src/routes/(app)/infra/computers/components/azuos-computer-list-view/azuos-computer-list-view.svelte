<script lang="ts" module>
  import {
    healthStatusLabel,
    healthStatusTone,
    type HealthStatus,
  } from '@template/shared/domain/computer-health.util';
  import { type ComputerKind } from '@template/shared/domain/computer-kind.util';
  import {
    departmentLabel,
    type Department,
    type DepartmentChoice,
  } from '@template/shared/domain/department.util';
  import {
    type Computer,
    type ComputerAlertFilter,
    type ComputerPreventiveFilter,
    type ComputerListItem,
  } from '@template/shared/schemas/computer.schema';
  import { type ReportFormat } from '@template/shared/schemas/report.schema';

  export type ComputerListFilter = {
    search: string;
    department: Department | '';
    healthStatus: HealthStatus | '';
    kind: ComputerKind | '';
    onlyOnline: boolean;
    onlyOffline: boolean;
    alert: ComputerAlertFilter | '';
    preventive: ComputerPreventiveFilter | '';
    includeArchived: boolean;
  };

  export type ComputerSummary = {
    total: number;
    online: number;
    offline: number;
    withAlerts: number;
    cpuHigh: number;
    memoryHigh: number;
    critical: number;
    attention: number;
    neverSeen: number;
  };

  /**
   * O INVENTÁRIO: as máquinas da empresa, na ordem do número (pelo nome físico).
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro — estados que, num componente que busca sozinho,
   * só apareceriam desligando o servidor.
   *
   * Não há botão de excluir, e a ausência é a regra do sistema: máquina que saiu de uso é
   * ARQUIVADA, porque é o histórico dela que sustenta "esta aqui deu problema demais, vamos
   * trocar" na hora de decidir compra.
   */
  export type AzuosComputerListViewProps = {
    data: {
      computers: ComputerListItem[];
      total: number;
      summary: ComputerSummary | null;
      filter: ComputerListFilter;
      /** O dia agendado de cada máquina (`AAAA-MM-DD`), pelo id. */
      scheduledFor?: Record<number, string>;
      /** Os departamentos do RH e, depois da linha, os daqui. */
      departmentOptions?: DepartmentChoice[];
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isTruncated: boolean;
      isSummaryLoading?: boolean;
      error: string | null;
      exportingFormat?: ReportFormat | null;
      exportError?: string | null;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onDepartmentChange: (department: Department | '') => void;
      onHealthStatusChange: (healthStatus: HealthStatus | '') => void;
      onKindChange: (kind: ComputerKind | '') => void;
      onOnlineChange: (onlyOnline: boolean) => void;
      onOfflineChange: (onlyOffline: boolean) => void;
      onAlertChange: (alert: ComputerAlertFilter | '') => void;
      onPreventiveChange: (preventive: ComputerPreventiveFilter | '') => void;
      onArchivedChange: (includeArchived: boolean) => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onOpen: (computer: Computer) => void;
      onRegister: () => void;
      onExportReport: (format: ReportFormat) => void;
    };
  };

  /**
   * O nome que a pessoa reconhece.
   *
   * O apelido dado pelo TI ganha da etiqueta que a máquina informa: quem procura "o
   * computador da recepção" não sabe que ele se chama RECEPCAO-01. O nome técnico continua
   * embaixo, porque é por ele que o agente aparece no log.
   */
  export function displayNameOf(computer: Computer): string {
    return computer.displayName?.trim() || computer.hardware?.hostname?.trim() || computer.name;
  }
</script>

<script lang="ts">
  import HardDrive from '@lucide/svelte/icons/hard-drive';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';

  import InventoryFilters from '../azuos-inventory-filters/azuos-inventory-filters.svelte';
  import ComputerMaintenanceStatus from '../azuos-computer-maintenance-status/azuos-computer-maintenance-status.svelte';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import ReportExportActions from '$lib/components/azuos-report-export-actions/azuos-report-export-actions.svelte';
  import StatCard from '$lib/components/azuos-stat-card/azuos-stat-card.svelte';
  import StatCardGrid from '$lib/components/azuos-stat-card-grid/azuos-stat-card-grid.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
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
  import { fillColorOf, fillFromPointer } from '$lib/motion/hover-fill';
  import { cn } from '$lib/utils/cn';
  import { formatTimeAgo } from '$lib/utils/format-machine';

  let { data, state, actions }: AzuosComputerListViewProps = $props();

  const summary = $derived(data.summary);
  const tableView = useTableViewModel();

  /* Quem clica num cartão do topo precisa VER o resultado: a tela rola até os filtros.
     Variável comum, e não `$state`: este componente recebe uma prop chamada `state`, e com ela
     o compilador lê `$state(...)` como inscrição numa store. */
  let filtersElement: HTMLElement | null = null;

  function filterByHealth(status: HealthStatus) {
    actions.onHealthStatusChange(data.filter.healthStatus === status ? '' : status);
    scrollToFilters();
  }

  function filterByOnline() {
    actions.onOnlineChange(!data.filter.onlyOnline);
    scrollToFilters();
  }

  function filterByOffline() {
    actions.onOfflineChange(!data.filter.onlyOffline);
    scrollToFilters();
  }

  function filterByAlert(alert: ComputerAlertFilter) {
    actions.onAlertChange(data.filter.alert === alert ? '' : alert);
    scrollToFilters();
  }

  function scrollToFilters() {
    const prefersLessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    filtersElement?.scrollIntoView?.({
      behavior: prefersLessMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }
</script>

<!-- max-w-(--breakpoint-2xl), e não 6xl como as outras listas: a tabela do inventário junta máquina,
     responsável, saúde, manutenção com a próxima data, chamados, situação e visto por último, e
     no 6xl a última coluna ficava cortada mesmo em tela cheia. -->
<div class="mx-auto flex w-full max-w-(--breakpoint-2xl) flex-col gap-5">
  <PageHeader
    data={{
      title: 'Inventário',
      description: 'Os computadores da empresa, e como cada um está passando.',
    }}
  >
    <ReportExportActions
      state={{ exportingFormat: state.exportingFormat ?? null }}
      actions={{ onExport: actions.onExportReport }}
    />
    <ActionButton
      data={{ label: 'Cadastrar computador' }}
      ui={{ icon: Plus }}
      actions={{ onClick: actions.onRegister }}
    />
  </PageHeader>

  {#if state.exportError}
    <ErrorState data={{ message: state.exportError }} ui={{ variant: 'inline' }} />
  {/if}

  <StatCardGrid>
    <StatCard
      data={{ label: 'Máquinas', value: summary?.total ?? 0 }}
      ui={{ tone: 'brand' }}
      state={{ isLoading: state.isSummaryLoading }}
    />
    <StatCard
      data={{ label: 'Online agora', value: summary?.online ?? 0 }}
      ui={{ tone: 'success' }}
      state={{ isLoading: state.isSummaryLoading, isSelected: data.filter.onlyOnline }}
      actions={{ onClick: filterByOnline }}
    />
    <!-- Estes dois são ATALHOS do filtro de saúde: clicar liga o mesmo filtro das pastilhas, e
         clicar de novo desliga. "Online agora" também alterna o filtro de conexão. -->
    <StatCard
      data={{ label: 'Saúde crítica', value: summary?.critical ?? 0 }}
      ui={{ tone: 'danger' }}
      state={{
        isLoading: state.isSummaryLoading,
        isSelected: data.filter.healthStatus === 'critical',
      }}
      actions={{ onClick: () => filterByHealth('critical') }}
    />
    <StatCard
      data={{
        label: 'Em atenção',
        value: summary?.attention ?? 0,
        hint: summary?.neverSeen ? `${summary.neverSeen} sem o agente instalado` : null,
      }}
      ui={{ tone: 'warning' }}
      state={{
        isLoading: state.isSummaryLoading,
        isSelected: data.filter.healthStatus === 'attention',
      }}
      actions={{ onClick: () => filterByHealth('attention') }}
    />
  </StatCardGrid>

  <!-- A segunda fileira: o que está fora do ar e o que está sofrendo AGORA. Cada cartão é
       atalho do filtro de mesmo nome logo abaixo — clicar liga, clicar de novo desliga. -->
  <StatCardGrid>
    <StatCard
      data={{ label: 'Offline', value: summary?.offline ?? 0 }}
      ui={{ tone: 'neutral' }}
      state={{ isLoading: state.isSummaryLoading, isSelected: data.filter.onlyOffline }}
      actions={{ onClick: filterByOffline }}
    />
    <StatCard
      data={{ label: 'Com alerta ativo', value: summary?.withAlerts ?? 0 }}
      ui={{ tone: 'danger' }}
      state={{ isLoading: state.isSummaryLoading, isSelected: data.filter.alert === 'any' }}
      actions={{ onClick: () => filterByAlert('any') }}
    />
    <StatCard
      data={{ label: 'CPU elevada', value: summary?.cpuHigh ?? 0 }}
      ui={{ tone: 'warning' }}
      state={{ isLoading: state.isSummaryLoading, isSelected: data.filter.alert === 'cpu' }}
      actions={{ onClick: () => filterByAlert('cpu') }}
    />
    <StatCard
      data={{ label: 'Memória elevada', value: summary?.memoryHigh ?? 0 }}
      ui={{ tone: 'warning' }}
      state={{ isLoading: state.isSummaryLoading, isSelected: data.filter.alert === 'memory' }}
      actions={{ onClick: () => filterByAlert('memory') }}
    />
  </StatCardGrid>

  <!-- Os filtros ficam juntos e acima da lista, para a pessoa ver de uma vez o que está
       limitando o que ela enxerga. -->
  <div bind:this={filtersElement} class="scroll-mt-4">
    <InventoryFilters
      data={{ filter: data.filter, departmentOptions: data.departmentOptions ?? [] }}
      state={{ isFilteredOut: state.isFilteredOut }}
      {actions}
    />
  </div>

  <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
  {#if state.error}
    <ErrorState
      data={{ title: 'Não consegui carregar o inventário', message: state.error }}
      state={{ isRetrying: state.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if state.isLoading}
    <p class="text-ink-500 py-10 text-center text-sm">Carregando os computadores…</p>
  {:else if state.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhum computador cadastrado',
        description:
          'Cadastre a primeira máquina para gerar o token e instalar o agente nela. A partir daí ela se atualiza sozinha.',
      }}
      ui={{ icon: HardDrive }}
    >
      <ActionButton
        data={{ label: 'Cadastrar computador' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onRegister }}
      />
    </EmptyState>
  {:else if state.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhum computador com esses filtros',
        description: 'Tente limpar os filtros para ver o parque inteiro.',
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
      data-slot="computer-cards-mobile"
    >
      {#each data.computers as computer (computer.id)}
        <!-- A cor da situação entra por onde o mouse entrou (`hover-fill`, em tokens.css). -->
        <div
          use:fillFromPointer
          style:--fill-color={fillColorOf(healthStatusTone(computer.healthStatus))}
          class="hover-fill border-border/70 bg-card flex min-w-0 flex-col rounded-surface border p-4 shadow-xs"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 flex-1 basis-40">
              <span class="block font-medium text-ink-900 break-words leading-snug">
                {displayNameOf(computer)}
              </span>
              <span class="block text-xs text-ink-500 break-words leading-tight mt-0.5"
                >{computer.hardware?.hostname || computer.name}</span
              >
            </div>
            <div class="flex flex-col items-end gap-1 shrink-0">
              <StatusBadge
                data={{ label: healthStatusLabel(computer.healthStatus) }}
                ui={{ tone: healthStatusTone(computer.healthStatus), size: 'sm' }}
              />
              <span class="text-xs text-ink-500 tabular-nums">
                {computer.healthScore}/100
              </span>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3 rounded-box bg-muted/40 p-3 text-sm min-[380px]:grid-cols-2">
            <div>
              <span class="text-muted-foreground block text-xs">Responsável</span>
              <span class="font-medium text-ink-700 break-words"
                >{computer.responsibleName ?? '—'}</span
              >
              <span class="block text-ink-500 text-xs">
                {computer.department ? departmentLabel(computer.department) : 'Sem departamento'}
              </span>
            </div>
            <div>
              <span class="text-muted-foreground block text-xs">Situação</span>
              {#if computer.isArchived}
                <StatusBadge data={{ label: 'Arquivada' }} ui={{ tone: 'neutral', size: 'sm' }} />
              {:else if computer.isBlocked}
                <StatusBadge data={{ label: 'Bloqueada' }} ui={{ tone: 'danger', size: 'sm' }} />
              {:else if computer.isOnline}
                <StatusBadge data={{ label: 'Online' }} ui={{ tone: 'success', size: 'sm' }} />
              {:else}
                <StatusBadge data={{ label: 'Offline' }} ui={{ tone: 'neutral', size: 'sm' }} />
              {/if}
              <span class="block text-ink-500 text-xs mt-1">
                {formatTimeAgo(computer.lastSeenAt)}
              </span>
            </div>
          </div>

          <!-- A caixa de manutenção cresce até o rodapé: os cartões da mesma linha têm a mesma
               altura, e sem isso cada um sobrava um vão diferente acima do "Ver ficha". -->
          <div class="mt-3 min-w-0 flex-1 rounded-box border border-border/60 bg-muted/20 p-3">
            <p class="text-muted-foreground mb-2 text-xs">Manutenção</p>
            <ComputerMaintenanceStatus data={{ computer, scheduledFor: data.scheduledFor?.[computer.id] ?? null }} />
          </div>

          <div class="border-border/60 mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <span class="text-xs text-ink-500">
              Chamados no mês: <strong class="text-foreground">{computer.ticketsThisMonth}</strong>
            </span>
            <ActionButton
              data={{ label: 'Ver ficha' }}
              ui={{ variant: 'secondary', size: 'sm' }}
              actions={{ onClick: () => actions.onOpen(computer) }}
            />
          </div>
        </div>
      {/each}
      <!-- Legenda da lista, não um cartão: ocupa a linha inteira embaixo da grade. -->
      <div class="text-muted-foreground col-span-full flex flex-wrap justify-between gap-2 px-1 text-xs">
        <span>Parque de computadores sincronizado</span>
        <span>{data.computers.length} computador(es) listado(s)</span>
      </div>
    </div>

    <!-- Tabela para desktop (>= xl) -->
    <div
      class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
      data-slot="computer-table-desktop"
    >
      <Table class="min-w-[1080px]">
        <TableHeader>
          <TableRow>
            <TableHead class="min-w-[240px]">Máquina</TableHead>
            <TableHead class="min-w-[180px]">Responsável</TableHead>
            <TableHead class="min-w-[120px]">Saúde</TableHead>
            <TableHead class="min-w-[200px]">Manutenção</TableHead>
            <TableHead class="min-w-[120px]">Chamados no mês</TableHead>
            <TableHead class="min-w-[120px]">Situação</TableHead>
            <TableHead class="min-w-[110px]">Vista</TableHead>
            <TableHead class="min-w-[100px] text-right"
              ><span class="sr-only">Ações</span></TableHead
            >
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.computers as computer (computer.id)}
            <TableRow>
              <TableCell class="max-w-[280px]">
                <span class="block font-medium text-ink-900 break-words leading-snug">
                  {displayNameOf(computer)}
                </span>
                <span class="block text-xs text-ink-500 break-words leading-tight mt-0.5"
                  >{computer.hardware?.hostname || computer.name}</span
                >
              </TableCell>
              <TableCell class="max-w-[220px]">
                <span class="block text-ink-700 break-words leading-snug"
                  >{computer.responsibleName ?? '—'}</span
                >
                <span class="block text-xs text-ink-500 mt-0.5">
                  {computer.department ? departmentLabel(computer.department) : 'Sem departamento'}
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge
                  data={{ label: healthStatusLabel(computer.healthStatus) }}
                  ui={{ tone: healthStatusTone(computer.healthStatus), size: 'sm' }}
                />
                <span class="block text-xs text-ink-500 tabular-nums">
                  {computer.healthScore}/100
                </span>
              </TableCell>
              <TableCell class="max-w-[240px]">
                <ComputerMaintenanceStatus data={{ computer, scheduledFor: data.scheduledFor?.[computer.id] ?? null }} />
              </TableCell>
              <!-- Quantos problemas esta máquina deu no mês corrente. Zero fica cinza e
                   discreto: a coluna existe para as que DÃO trabalho saltarem aos olhos. -->
              <TableCell class="tabular-nums">
                <span
                  class={computer.ticketsThisMonth > 0
                    ? 'text-ink-900 font-medium'
                    : 'text-ink-500'}
                >
                  {computer.ticketsThisMonth}
                </span>
              </TableCell>
              <TableCell>
                <!-- Arquivada e bloqueada vêm antes de online/offline: são decisões do TI, e
                     explicam por que a máquina não está enviando nada. -->
                {#if computer.isArchived}
                  <StatusBadge data={{ label: 'Arquivada' }} ui={{ tone: 'neutral', size: 'sm' }} />
                {:else if computer.isBlocked}
                  <StatusBadge data={{ label: 'Bloqueada' }} ui={{ tone: 'danger', size: 'sm' }} />
                {:else if computer.isOnline}
                  <StatusBadge data={{ label: 'Online' }} ui={{ tone: 'success', size: 'sm' }} />
                {:else}
                  <StatusBadge data={{ label: 'Offline' }} ui={{ tone: 'neutral', size: 'sm' }} />
                {/if}
              </TableCell>
              <TableCell class="text-ink-500 whitespace-nowrap text-xs">
                {formatTimeAgo(computer.lastSeenAt)}
              </TableCell>
              <TableCell class="text-right whitespace-nowrap">
                <TableActions>
                  <ActionButton
                    data={{ label: 'Ver ficha' }}
                    ui={{ variant: 'secondary', size: 'sm' }}
                    actions={{ onClick: () => actions.onOpen(computer) }}
                  />
                </TableActions>
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
        {#snippet footer()}
          <span>Parque de computadores sincronizado com o agente</span>
          <span>{data.computers.length} computador(es) listado(s)</span>
        {/snippet}
      </Table>
    </div>

    <!-- Truncar calado é mentir sobre o tamanho do parque. -->
    {#if state.isTruncated}
      <p class="text-ink-500 text-xs">
        Mostrando {data.computers.length} de {data.total} computadores. Use os filtros para chegar ao
        que procura.
      </p>
    {/if}
  {/if}
</div>
