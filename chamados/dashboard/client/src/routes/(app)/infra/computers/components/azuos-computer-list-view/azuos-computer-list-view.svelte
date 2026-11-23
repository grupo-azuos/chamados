<!--
  @component
  O INVENTÁRIO: as máquinas da empresa, no formato da lista de empresas do Paralegal.

  A ordem é a do molde de toda tela (padrão Apple): cabeçalho (exportar e "Cadastrar
  computador") → os cartões de resumo → a barra de ferramentas (busca → departamento → "Filtros" →
  formato tabela/cards) → o conteúdo → a paginação.

  Os cartões de resumo são o `AzuosStatCard` com o ícone cheio do assunto, e os que filtram são
  atalhos: clicar liga o filtro (e rola até a barra), clicar de novo desliga, e o escolhido fica
  marcado. "Máquinas" é o "Total" do Paralegal: marcado quando nenhum atalho está valendo, e
  clicar nele desliga todos. O resumo é do parque inteiro e não acompanha o filtro.

  Nos cartões, a grade pagina (`AzuosPaginationBar`); a tabela rola. Cartão (`AzuosComputerCard`) e
  linha (`AzuosComputerTable`) mostram a mesma máquina, com o selo que pisca quando há alerta
  crítico aberto ou preventiva vencida. O hover é sempre o neutro.

  Não há botão de excluir, e a ausência é a regra do sistema: máquina que saiu de uso é ARQUIVADA,
  porque é o histórico dela que sustenta a decisão de compra.

  Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando, vazia,
  filtrada sem resultado e em erro.

  - `data`: `computers`, `total`, `summary`, `filter`, `scheduledFor`, `departmentOptions`,
    `responsibleOptions`, `sort`
    e `paging`.
  - `state`: `isLoading`, `isRefetching`, `isEmpty`, `isFilteredOut`, `isTruncated`,
    `isSummaryLoading`, `error`, `exportingFormat` e `exportError`.
  - `actions`: um `on…Change` por filtro, `onClearFilters`, `onClearShortcuts`, `onSortChange`,
    `onPageChange`, `onRetry`, `onOpen(computer)`, `onRegister` e `onExportReport(format)`.
-->
<script lang="ts" module>
  import { type ResourceCondition } from '@template/shared/domain/computer-resource.util';
  import { type HealthStatus } from '@template/shared/domain/computer-health.util';
  import { type ComputerKind } from '@template/shared/domain/computer-kind.util';
  import { type Department, type DepartmentChoice } from '@template/shared/domain/department.util';
  import {
    type Computer,
    type ComputerAlertFilter,
    type ComputerPreventiveFilter,
    type ComputerListItem,
  } from '@template/shared/schemas/computer.schema';
  import { type ReportFormat } from '@template/shared/schemas/report.schema';
  import type { LucideIcon } from '@lucide/svelte';
  import { type StatCardTone } from '$lib/components/azuos-stat-card/azuos-stat-card.svelte';
  import { type ComputerUpgradeFilter } from '@template/shared/domain/computer-upgrade.util';
  import { type AzuosPersonPickerPerson } from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';

  import {
    type ComputerTableSort,
    type ComputerTableSortField,
  } from '../azuos-computer-table/azuos-computer-table.svelte';

  /* O nome da máquina mora no cartão (quem mais o usa); daqui ele continua exportado, como era. */
  export { displayNameOf } from '../azuos-computer-card/azuos-computer-card.svelte';

  export type ComputerListFilter = {
    search: string;
    department: Department | '';
    healthStatus: HealthStatus | '';
    kind: ComputerKind | '';
    onlyOnline: boolean;
    onlyOffline: boolean;
    alert: ComputerAlertFilter | '';
    resourceCondition: ResourceCondition | '';
    preventive: ComputerPreventiveFilter | '';
    includeArchived: boolean;
    /** O id da pessoa do diretório, ou `COMPUTER_NO_RESPONSIBLE_FILTER`. */
    responsibleId: string;
    upgrade: ComputerUpgradeFilter | '';
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
    needsUpgrade: number;
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
      /** As pessoas do filtro "Responsável", com a foto. */
      responsibleOptions?: AzuosPersonPickerPerson[];
      /** A ordem em vigor — a seta do cabeçalho da tabela. */
      sort?: ComputerTableSort;
      /** A página dos cartões. Sem ela, a grade mostra tudo (o Storybook, os testes antigos). */
      paging?: { page: number; pageSize: number; total: number };
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
      onResourceConditionChange: (resourceCondition: ResourceCondition | '') => void;
      onPreventiveChange: (preventive: ComputerPreventiveFilter | '') => void;
      onArchivedChange: (includeArchived: boolean) => void;
      onResponsibleChange: (responsibleId: string) => void;
      onUpgradeChange: (upgrade: ComputerUpgradeFilter | '') => void;
      onClearFilters: () => void;
      /** "Máquinas": desliga os atalhos dos cartões. Sem ele, o cartão só mostra o número. */
      onClearShortcuts?: () => void;
      onSortChange?: (field: ComputerTableSortField) => void;
      onPageChange?: (page: number) => void;
      onRetry: () => void;
      onOpen: (computer: Computer) => void;
      onRegister: () => void;
      onExportReport: (format: ReportFormat) => void;
    };
  };

  /** A página dos cartões: o recorte da lista que cabe nela. Sem página, a lista inteira. */
  export function pageSliceOf<T>(
    items: readonly T[],
    paging?: { page: number; pageSize: number } | null,
  ): T[] {
    if (!paging) return [...items];

    const start = (paging.page - 1) * paging.pageSize;

    return items.slice(start, start + paging.pageSize);
  }

  /** Um cartão-atalho do topo: o número, o tom do ícone e o filtro que ele liga. */
  export type StatShortcut = {
    key: string;
    label: string;
    value: number;
    tone: StatCardTone;
    icon: LucideIcon;
    isSelected: boolean;
    onClick: () => void;
  };

  /** Nenhum atalho dos cartões ligado: é quando "Máquinas" (o total) fica marcado. */
  export function hasNoShortcut(filter: ComputerListFilter): boolean {
    return (
      !filter.healthStatus && !filter.alert && !filter.onlyOnline && !filter.onlyOffline && !filter.upgrade
    );
  }
</script>

<script lang="ts">
  import BellRing from '@lucide/svelte/icons/bell-ring';
  import CircleFadingArrowUp from '@lucide/svelte/icons/circle-fading-arrow-up';
  import Cpu from '@lucide/svelte/icons/cpu';
  import HardDrive from '@lucide/svelte/icons/hard-drive';
  import HeartPulse from '@lucide/svelte/icons/heart-pulse';
  import MemoryStick from '@lucide/svelte/icons/memory-stick';
  import Monitor from '@lucide/svelte/icons/monitor';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import Wifi from '@lucide/svelte/icons/wifi';
  import WifiOff from '@lucide/svelte/icons/wifi-off';

  import ComputerCard from '../azuos-computer-card/azuos-computer-card.svelte';
  import ComputerTable from '../azuos-computer-table/azuos-computer-table.svelte';
  import InventoryFilters from '../azuos-inventory-filters/azuos-inventory-filters.svelte';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import PaginationBar from '$lib/components/azuos-pagination-bar/azuos-pagination-bar.svelte';
  import ReportExportActions from '$lib/components/azuos-report-export-actions/azuos-report-export-actions.svelte';
  import StatCard from '$lib/components/azuos-stat-card/azuos-stat-card.svelte';
  import StatCardGrid from '$lib/components/azuos-stat-card-grid/azuos-stat-card-grid.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, state, actions }: AzuosComputerListViewProps = $props();

  const summary = $derived(data.summary);
  const tableView = useTableViewModel();
  const cardComputers = $derived(pageSliceOf(data.computers, data.paging));
  /* A barra só aparece quando há mais de uma página: "24 computadores" sozinho já diz tudo. */
  const showsPaging = $derived(
    Boolean(data.paging && actions.onPageChange && data.paging.total > data.paging.pageSize),
  );

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

  function filterByUpgrade() {
    actions.onUpgradeChange(data.filter.upgrade === 'any' ? '' : 'any');
    scrollToFilters();
  }

  /**
   * A segunda fileira: o que está fora do ar, o que está sofrendo AGORA e quem está aquém.
   * Cinco cartões passam do limite de quatro por linha: como lista, a fileira vira a faixa que
   * desliza (`AzuosStatCardGrid`), em vez de uma terceira linha com um cartão sozinho. O upgrade
   * vem logo depois do offline, à vista: é a pergunta que a tela de Inteligência respondia; o
   * último da faixa (memória elevada) fica a uma seta.
   */
  const secondRow = $derived<StatShortcut[]>([
    {
      key: 'offline',
      label: 'Offline',
      value: summary?.offline ?? 0,
      tone: 'slate',
      icon: WifiOff,
      isSelected: data.filter.onlyOffline,
      onClick: filterByOffline,
    },
    /* Upgrade é atenção, não emergência: amarelo, como o aviso do cartão. */
    {
      key: 'upgrade',
      label: 'Precisa de upgrade',
      value: summary?.needsUpgrade ?? 0,
      tone: 'yellow',
      icon: CircleFadingArrowUp,
      isSelected: data.filter.upgrade === 'any',
      onClick: filterByUpgrade,
    },
    {
      key: 'alerts',
      label: 'Com alerta ativo',
      value: summary?.withAlerts ?? 0,
      tone: 'danger',
      icon: BellRing,
      isSelected: data.filter.alert === 'any',
      onClick: () => filterByAlert('any'),
    },
    {
      key: 'cpu',
      label: 'CPU elevada',
      value: summary?.cpuHigh ?? 0,
      tone: 'copper',
      icon: Cpu,
      isSelected: data.filter.alert === 'cpu',
      onClick: () => filterByAlert('cpu'),
    },
    {
      key: 'memory',
      label: 'Memória elevada',
      value: summary?.memoryHigh ?? 0,
      tone: 'plum',
      icon: MemoryStick,
      isSelected: data.filter.alert === 'memory',
      onClick: () => filterByAlert('memory'),
    },
  ]);

  function showAll() {
    actions.onClearShortcuts?.();
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
<div class="mx-auto flex w-full max-w-(--breakpoint-2xl) flex-col gap-6">
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

  <!-- Os cartões de resumo, como os "Por tag" do Paralegal: o ícone cheio carrega a cor do
       assunto, o número fica na cor do texto, e os que filtram são atalhos — clicar liga, clicar
       de novo desliga. Cartões de grupos diferentes se somam (saúde E alerta); do mesmo grupo,
       um troca o outro. -->
  <StatCardGrid>
    <StatCard
      data={{ label: 'Máquinas', value: summary?.total ?? 0 }}
      ui={{ tone: 'brand', icon: Monitor }}
      state={{
        isLoading: state.isSummaryLoading,
        isSelected: actions.onClearShortcuts ? hasNoShortcut(data.filter) : false,
      }}
      actions={actions.onClearShortcuts ? { onClick: showAll } : undefined}
    />
    <StatCard
      data={{ label: 'Online agora', value: summary?.online ?? 0 }}
      ui={{ tone: 'success', icon: Wifi }}
      state={{ isLoading: state.isSummaryLoading, isSelected: data.filter.onlyOnline }}
      actions={{ onClick: filterByOnline }}
    />
    <StatCard
      data={{ label: 'Saúde crítica', value: summary?.critical ?? 0 }}
      ui={{ tone: 'danger', icon: HeartPulse }}
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
      ui={{ tone: 'warning', icon: TriangleAlert }}
      state={{
        isLoading: state.isSummaryLoading,
        isSelected: data.filter.healthStatus === 'attention',
      }}
      actions={{ onClick: () => filterByHealth('attention') }}
    />
  </StatCardGrid>

  <!-- A segunda fileira: fora do ar, sofrendo AGORA e quem precisa de upgrade. -->
  <StatCardGrid data={{ items: secondRow }} ui={{ ariaLabel: 'Conexão, alertas e upgrade' }}>
    {#snippet card(shortcut: StatShortcut)}
      <StatCard
        data={{ label: shortcut.label, value: shortcut.value }}
        ui={{ tone: shortcut.tone, icon: shortcut.icon }}
        state={{ isLoading: state.isSummaryLoading, isSelected: shortcut.isSelected }}
        actions={{ onClick: shortcut.onClick }}
      />
    {/snippet}
  </StatCardGrid>

  <!-- Os filtros ficam juntos e acima da lista, para a pessoa ver de uma vez o que está
       limitando o que ela enxerga. -->
  <div bind:this={filtersElement} class="scroll-mt-4">
    <InventoryFilters
      data={{
        filter: data.filter,
        departmentOptions: data.departmentOptions ?? [],
        responsibleOptions: data.responsibleOptions ?? [],
      }}
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
    <!-- CARTÃO PAGINA, TABELA ROLA (como no Paralegal). Os cartões valem sempre no celular e no
         tablet; no monitor, só quando a pessoa pediu cards (`AzuosTableViewToggle`). A barra de
         páginas mora junto da grade, para sumir e aparecer com ela. -->
    <div class={cn('flex flex-col gap-3', !tableView.forceCards && 'xl:hidden')}>
      <div class="card-grid" data-slot="computer-cards-mobile">
        {#each cardComputers as computer (computer.id)}
          <ComputerCard
            data={{ computer, scheduledFor: data.scheduledFor?.[computer.id] ?? null }}
            actions={{ onOpen: actions.onOpen }}
          />
        {/each}
      </div>
      {#if showsPaging && data.paging && actions.onPageChange}
        <PaginationBar
          data={{
            page: data.paging.page,
            pageSize: data.paging.pageSize,
            total: data.paging.total,
            noun: ['computador', 'computadores'],
          }}
          actions={{ onPageChange: actions.onPageChange }}
        />
      {:else}
        <p class="text-muted-foreground px-1 text-right text-xs">
          {data.computers.length} computador(es) listado(s)
        </p>
      {/if}
    </div>

    <div
      class={cn(tableView.forceCards ? 'hidden' : 'hidden xl:block')}
      data-slot="computer-table-desktop"
    >
      <ComputerTable
        data={{ computers: data.computers, sort: data.sort, scheduledFor: data.scheduledFor }}
        actions={{ onOpen: actions.onOpen, onSortChange: actions.onSortChange }}
      />
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
