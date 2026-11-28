<!--
  @component
  O HISTÓRICO DE MANUTENÇÃO: o que já foi feito em cada equipamento, do mais recente para o mais
  antigo.

  O quadro de preventivas (`AzuosPreventiveBoard`) fica ACIMA da lista de propósito: ele responde
  "o que falta fazer", e a lista responde "o que já foi feito". Quem abre a tela de manhã está atrás
  da primeira pergunta. Depois vêm a busca, o filtro de tipo, a alternância entre cards (celular) e
  tabela (monitor) e a paginação. Cada registro mostra a máquina (pelo apelido) ou o equipamento de
  fora, o tipo, a data, quem fez, "Corrigir" e "Excluir" — que pergunta antes; o registro vai para
  "Removidos", onde dá para desfazer. Lista cortada avisa, em vez de esconder o tamanho do
  histórico.

  Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando, vazia,
  filtrada sem resultado e em erro.

  - `data`: `maintenances`, `total`, `preventive`, `schedules`, `filter`, `removing` e `paging`.
  - `state`: `isLoading`, `isRefetching`, `isEmpty`, `isFilteredOut`, `isTruncated`,
    `isPreventiveLoading`, `isRemoving`, `error` e `actionError`.
  - `actions`: filtros (`onSearchChange`, `onTypeChange`, `onClearFilters`), `onPageChange`,
    `onRetry`, `onRegister(computerId?)`, `onEdit` e a exclusão (`onAskRemove`, `onCancelRemove`,
    `onConfirmRemove`).
-->
<script lang="ts" module>
  import { personNameOf } from '$lib/hooks/use-people-directory/people-directory.svelte';
  import { departmentLabel } from '@template/shared/domain/department.util';
  import {
    MAINTENANCE_TYPES,
    MAINTENANCE_TYPE_LABELS,
    maintenanceTypeLabel,
    maintenanceTypeTone,
    type MaintenanceType,
  } from '@template/shared/domain/maintenance.util';
  import {
    type Maintenance,
    type MaintenanceSchedule,
    type PreventiveDue,
  } from '@template/shared/schemas/maintenance.schema';

  export type MaintenanceListFilter = {
    search: string;
    type: MaintenanceType | '';
    computerId: number | null;
  };

  /**
   * O HISTÓRICO DE MANUTENÇÃO: o que já foi feito em cada equipamento, do mais recente para o
   * mais antigo.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro.
   *
   * O quadro de preventivas fica ACIMA da lista de propósito: ele responde "o que falta
   * fazer", e a lista responde "o que já foi feito". Quem abre a tela de manhã está atrás da
   * primeira pergunta.
   */
  export type AzuosMaintenanceListViewProps = {
    data: {
      maintenances: Maintenance[];
      total: number;
      preventive: PreventiveDue[];
      /** As manutenções agendadas — o quadro de preventivas as mostra no alto. */
      schedules?: MaintenanceSchedule[];
      filter: MaintenanceListFilter;
      removing: Maintenance | null;
      paging?: {
        page: number;
        pageSize: number;
        total: number;
      };
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isTruncated: boolean;
      isPreventiveLoading?: boolean;
      isRemoving?: boolean;
      error: string | null;
      actionError?: string | null;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onTypeChange: (type: MaintenanceType | '') => void;
      onPageChange?: (page: number) => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onRegister: (computerId?: number) => void;
      onEdit: (maintenance: Maintenance) => void;
      onAskRemove: (maintenance: Maintenance) => void;
      onCancelRemove: () => void;
      onConfirmRemove: () => void;
    };
  };

  const TYPE_FILTER_OPTIONS = MAINTENANCE_TYPES.map((type) => ({
    value: type,
    label: MAINTENANCE_TYPE_LABELS[type],
    tone: maintenanceTypeTone(type),
  }));

  /**
   * De quem é este serviço, em uma linha.
   *
   * Máquina do inventário aparece pelo apelido (é como as pessoas a chamam); equipamento de
   * fora aparece pelo que foi digitado. Um registro sempre tem um dos dois — o banco recusa
   * linha sem nenhum.
   */
  export function machineLabelOf(maintenance: Maintenance): string {
    if (maintenance.computerId) {
      return maintenance.computerDisplayName?.trim() || maintenance.computerName || 'Máquina';
    }

    return maintenance.otherMachine ?? 'Equipamento não identificado';
  }

  /** Onde a máquina mora: o departamento dela, ou o aviso de que está fora do inventário. */
  /**
   * Quem fez, um rosto por pessoa — só quando é mais de uma (uma pessoa é o rosto de sempre). Os
   * nomes chegam juntos em `performedBy` ("Ana Souza, Caio Reis"), na mesma ordem dos ids.
   */
  export function performersOf(
    maintenance: Pick<Maintenance, 'performedBy' | 'performedByIds'>,
  ): { id: string | null; name: string }[] {
    const names = (maintenance.performedBy ?? '').split(',').map((name) => name.trim()).filter(Boolean);
    const ids = maintenance.performedByIds ?? [];
    /* Conta pelo que tiver mais: os ids (quem foi escolhido na lista) ou os nomes (o registro
       antigo, que só guardou o nome). O nome vem do diretório pelo id e, sem ele, do registro. */
    const count = Math.max(ids.length, names.length);
    if (count < 2) return [];

    return Array.from({ length: count }, (_, index) => {
      const id = ids[index] ?? null;
      return { id, name: personNameOf(id) ?? names[index] ?? 'Sem cadastro' };
    });
  }

  /**
   * QUEM FEZ, uma pessoa — o rosto e o nome do rodapé. Vale o id escolhido em "Quem fez", com o
   * nome de hoje no diretório; o nome gravado em `performedBy` é só o recurso do registro antigo,
   * que não guardou o id. Ler o nome gravado primeiro deixava o card com o nome de antes da
   * correção (quem registrou) mesmo depois de trocar a pessoa.
   */
  export function performerOf(
    maintenance: Pick<Maintenance, 'performedBy' | 'performedByIds'>,
  ): { id: string | null; name: string } | null {
    const id = maintenance.performedByIds?.[0] ?? null;
    const recorded = (maintenance.performedBy ?? '').split(',')[0]?.trim() || null;
    const name = personNameOf(id) ?? recorded;

    return name ? { id, name } : null;
  }

  /** O nome do rodapé: com várias pessoas, a primeira "e mais N" — os nomes todos não cabem. */
  export function performersTitleOf(maintenance: Pick<Maintenance, 'performedBy' | 'performedByIds'>): string {
    const faces = performersOf(maintenance);
    if (faces.length > 1) return `${faces[0]!.name} e mais ${faces.length - 1}`;

    return performerOf(maintenance)?.name ?? 'Sem responsável';
  }

  /** A segunda linha do equipamento na tabela: o nome da máquina e o departamento. */
  export function placeLineOf(maintenance: Maintenance): string {
    if (!maintenance.computerId) return 'Fora do inventário';
    const department = maintenance.computerDepartment ? departmentLabel(maintenance.computerDepartment) : null;

    return [maintenance.computerName, department].filter(Boolean).join(' · ');
  }

  export function placeOf(maintenance: Maintenance): string {
    if (!maintenance.computerId) return 'Fora do inventário';

    return maintenance.computerDepartment ? departmentLabel(maintenance.computerDepartment) : 'Sem departamento';
  }
</script>

<script lang="ts">
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Wrench from '@lucide/svelte/icons/wrench';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ActionMenu from '$lib/components/azuos-action-menu/azuos-action-menu.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import ConfirmDialog from '$lib/components/azuos-confirm-dialog/azuos-confirm-dialog.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import OptionPicker from '$lib/components/azuos-option-picker/azuos-option-picker.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import CollapsibleFilters from '$lib/components/azuos-collapsible-filters/azuos-collapsible-filters.svelte';
  import ListToolbar from '$lib/components/azuos-list-toolbar/azuos-list-toolbar.svelte';
  import PreventiveBoard from '../azuos-preventive-board/azuos-preventive-board.svelte';
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
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { cn } from '$lib/utils/cn';
  import { formatDate } from '$lib/utils/format-date';

  let { data, state: viewState, actions }: AzuosMaintenanceListViewProps = $props();

  const tableView = useTableViewModel();

  const hasActiveFilter = $derived(Boolean(data.filter.search || data.filter.type));
</script>

<div class="flex w-full flex-col gap-6">
  <PageHeader
    data={{
      title: 'Manutenção',
      description: 'O que já foi feito em cada máquina, e o que está para vencer.',
    }}
  >
    <ActionButton
      data={{ label: 'Registrar manutenção' }}
      ui={{ icon: Plus }}
      actions={{ onClick: () => actions.onRegister() }}
    />
  </PageHeader>

  <PreventiveBoard
    data={{ rows: data.preventive, schedules: data.schedules }}
    state={{ isLoading: viewState.isPreventiveLoading }}
    actions={{
      onRegister: (row) => actions.onRegister(row.computerId),
      onRegisterMachine: (computerId) => actions.onRegister(computerId),
    }}
  />

  <!-- A falha de uma AÇÃO fica na tela, em vermelho, até resolver (CONTRIBUTING §15). -->
  {#if viewState.actionError}
    <ErrorState data={{ title: 'Não consegui excluir', message: viewState.actionError }} />
  {/if}

  <!-- O cartão de filtros do grupo (o de Empresas do paralegal): a busca à vista, com o filtro principal.
       "Limpar filtros" só aparece quando há o que limpar; quando o filtro escondeu tudo,
       quem o oferece é o aviso de lista vazia — dois botões iguais só confundem. -->
  <div class="flex flex-col gap-3">
    <CollapsibleFilters
      data={{ label: 'Filtros das manutenções', activeCount: 0 }}
      state={{ hasFilter: hasActiveFilter && !viewState.isFilteredOut }}
      actions={{ onClear: actions.onClearFilters }}
    >
      {#snippet primary()}
        <TextField
          data={{
            label: 'Buscar',
            name: 'search',
            value: data.filter.search,
            placeholder: 'O que foi feito, quem fez ou o nome do equipamento',
          }}
          actions={{ onChange: actions.onSearchChange }}
        />
        <FilterField ui={{ className: 'sm:w-full' }} data={{ label: 'Tipo' }}>
          <OptionPicker
            data={{ value: data.filter.type, options: TYPE_FILTER_OPTIONS }}
            ui={{ ariaLabel: 'Filtrar por tipo', allLabel: 'Todos os tipos' }}
            actions={{
              onChange: (value: string) => actions.onTypeChange(value as MaintenanceType | ''),
            }}
          />
        </FilterField>
      {/snippet}
    </CollapsibleFilters>
  </div>

  <!-- A barra da lista: cards ou tabela à esquerda; à direita as páginas — o histórico pagina no
       servidor nos dois formatos. Carregando, vazia ou com erro, não há lista para contar. -->
  {#if !viewState.isLoading && !viewState.error && !viewState.isEmpty}
    {@render listToolbar('top')}
  {/if}

  <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
  {#if viewState.error}
    <ErrorState
      data={{ title: 'Não consegui carregar as manutenções', message: viewState.error }}
      state={{ isRetrying: viewState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if viewState.isLoading}
    <!-- O esqueleto tem a forma da grade de cards: a tela não pula quando a lista chega. -->
    <div role="status" aria-label="Carregando as manutenções…" aria-busy="true" class="card-grid">
      {#each [0, 1, 2, 3, 4, 5] as slot (slot)}
        <Skeleton class="rounded-surface h-52 w-full" />
      {/each}
    </div>
  {:else if viewState.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhuma manutenção registrada',
        description:
          'Registre a primeira para começar o histórico. É por ele que se enxerga qual máquina dá trabalho demais.',
      }}
      ui={{ icon: Wrench }}
    >
      <ActionButton
        data={{ label: 'Registrar manutenção' }}
        ui={{ icon: Plus }}
        actions={{ onClick: () => actions.onRegister() }}
      />
    </EmptyState>
  {:else if viewState.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhuma manutenção com esses filtros',
        description: 'Tente limpar os filtros para ver o histórico inteiro.',
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
      data-slot="maintenance-cards-mobile"
    >
      {#each data.maintenances as maintenance (maintenance.id)}
        <!-- O cartão de registro do sistema: o card inteiro abre a correção; editar e excluir
             moram no menu de três pontinhos. -->
        <ContentCard
          data={{
            label: `Editar a manutenção de ${machineLabelOf(maintenance)}`,
            title: machineLabelOf(maintenance),
            code: maintenance.computerId ? maintenance.computerName : null,
            meta: placeOf(maintenance),
            status: { label: maintenanceTypeLabel(maintenance.type), tone: maintenanceTypeTone(maintenance.type) },
            footer: {
              title: performersTitleOf(maintenance),
              subtitle: formatDate(maintenance.performedAt),
              person: performerOf(maintenance),
              /* Quem fez pode ser mais de uma pessoa: o rosto de cada uma, com a foto. */
              people: performersOf(maintenance),
            },
            openLabel: 'Editar',
            menu: {
              label: `Ações da manutenção de ${machineLabelOf(maintenance)}`,
              items: [
                { id: 'edit', label: 'Editar', icon: Pencil },
                { id: 'remove', label: 'Excluir', icon: Trash2, isDestructive: true, separatorBefore: true },
              ],
            },
          }}
          ui={{
            icon: Wrench,
            iconTone: maintenanceTypeTone(maintenance.type),
            slot: 'maintenance-card',
          }}
          actions={{
            onOpen: () => actions.onEdit(maintenance),
            onMenuSelect: (id) =>
              id === 'remove' ? actions.onAskRemove(maintenance) : actions.onEdit(maintenance),
          }}
        >
          {#snippet body()}
            <p class="text-ink-700 line-clamp-3 text-xs break-words">{maintenance.description ?? '—'}</p>
          {/snippet}
        </ContentCard>
      {/each}
    </div>

    <!-- Tabela para desktop (>= xl) -->
    <div
      class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
      data-slot="maintenance-table-desktop"
    >
      <Table class="min-w-[840px]">
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Equipamento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>O que foi feito</TableHead>
            <TableHead>Quem fez</TableHead>
            <TableActionsHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.maintenances as maintenance (maintenance.id)}
            <TableRow class="align-top">
              <TableCell class="text-ink-500 whitespace-nowrap text-xs">
                {formatDate(maintenance.performedAt)}
              </TableCell>
              <!-- O nome numa linha só, cortado com "…" no teto da coluna (o inteiro no balão). -->
              <TableCell>
                <span class="text-ink-900 block leading-snug font-medium">
                  <TableText data={{ text: machineLabelOf(maintenance) }} ui={{ className: 'max-w-72' }} />
                </span>
                <span class="text-ink-500 mt-0.5 block text-xs leading-tight">
                  <TableText data={{ text: placeLineOf(maintenance) }} ui={{ className: 'max-w-72' }} />
                </span>
              </TableCell>
              <TableCell class="whitespace-nowrap">
                <StatusBadge
                  data={{ label: maintenanceTypeLabel(maintenance.type) }}
                  ui={{ tone: maintenanceTypeTone(maintenance.type), size: 'sm' }}
                />
              </TableCell>
              <TableCell class="text-ink-700">
                <TableText data={{ text: maintenance.description, empty: '—' }} ui={{ className: 'max-w-72' }} />
              </TableCell>
              <!-- Quem fez, com a FOTO de cada um (o rosto acha pelo id; o registro antigo, pelo
                   nome) — como no card. -->
              <TableCell class="text-ink-700 text-xs">
                {#if performerOf(maintenance)}
                  {@const one = performerOf(maintenance)!}
                  {@const faces = performersOf(maintenance)}
                  <span class="flex min-w-0 items-center gap-2">
                    <span class="flex shrink-0 -space-x-2">
                      {#each faces.length > 0 ? faces : [one] as face (face.id ?? face.name)}
                        <span class="ring-card rounded-full ring-2">
                          <PersonAvatar name={face.name} personId={face.id} ui={{ size: 'sm' }} />
                        </span>
                      {/each}
                    </span>
                    <TableText data={{ text: performersTitleOf(maintenance) }} ui={{ className: 'max-w-36' }} />
                  </span>
                {:else}
                  —
                {/if}
              </TableCell>
              <TableActionsCell>
                <!-- A ação da linha mora no menu de três pontinhos, como no card. -->
                  <ActionMenu
                    data={{
                      label: `Ações da manutenção de ${machineLabelOf(maintenance)}`,
                      items: [
                        { id: 'edit', label: 'Corrigir', icon: Pencil },
                        { id: 'remove', label: 'Excluir', icon: Trash2, isDestructive: true, separatorBefore: true },
                      ],
                    }}
                    ui={{ isIconOnly: true }}
                    actions={{
                      onSelect: (id) =>
                        id === 'remove' ? actions.onAskRemove(maintenance) : actions.onEdit(maintenance),
                    }}
                  />

              </TableActionsCell>
            </TableRow>
          {/each}
        </TableBody>
        {#snippet footer()}
          <span>Histórico de manutenções preventivas e corretivas</span>
          <span>{data.maintenances.length} registro(s)</span>
        {/snippet}
      </Table>
    </div>

    <!-- As páginas também no pé: quem chegou ao fim troca de página sem rolar de volta. -->
    {#if data.paging && data.paging.total > data.paging.pageSize && actions.onPageChange}
      {@render listToolbar('bottom')}
    {/if}

    <!-- Truncar calado é mentir sobre o tamanho do histórico. -->
    {#if viewState.isTruncated}
      <p class="text-ink-500 text-xs">
        Mostrando {data.maintenances.length} de {data.total} manutenções. Use os filtros para chegar
        ao que procura.
      </p>
    {/if}
  {/if}
</div>

<ConfirmDialog
  data={{
    title: 'Excluir esta manutenção?',
    description: data.removing
      ? `O registro de ${formatDate(data.removing.performedAt)} em ${machineLabelOf(data.removing)} sai do histórico. Ele fica em "Removidos", onde dá para desfazer.`
      : '',
    confirmLabel: 'Excluir manutenção',
    confirmingLabel: 'Excluindo…',
  }}
  ui={{ tone: 'danger' }}
  state={{
    isOpen: data.removing !== null,
    isConfirming: viewState.isRemoving,
    error: viewState.actionError,
  }}
  actions={{ onConfirm: actions.onConfirmRemove, onCancel: actions.onCancelRemove }}
/>

{#snippet listToolbar(position: 'top' | 'bottom')}
  <ListToolbar
    data={{
      layout: 'card',
      scroll: { loaded: data.maintenances.length, totalItems: data.total },
      pages: {
        page: data.paging?.page ?? 1,
        pageSize: data.paging?.pageSize ?? Math.max(1, data.maintenances.length),
        totalItems: data.paging?.total ?? data.maintenances.length,
      },
      noun: ['manutenção', 'manutenções'],
      gender: 'feminine',
    }}
    ui={{ position }}
    actions={{ onPageChange: (page: number) => actions.onPageChange?.(page) }}
  />
{/snippet}
