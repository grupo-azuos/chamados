<!--
  @component
  O ANDAMENTO DOS SISTEMAS na Central — para quem pede chamado ver o que já está em curso antes de
  abrir outro: um card por sistema (o card padrão do grupo), com a situação, os chamados e as issues
  abertas e o último movimento no GitHub. O card abre o mapa completo do sistema.

  - `data`: `systems` (já filtrados), `search`, `total`.
  - `state`: `isLoading`, `error`.
  - `actions`: `onSearch`, `onOpen`, `onRetry`.
-->
<script lang="ts" module>
  import { type SupportSystem } from '@template/shared/schemas/project-map.schema';

  export type AzuosSupportSystemsViewProps = {
    data: { systems: SupportSystem[]; search: string; total: number };
    state?: { isLoading?: boolean; error?: string | null };
    actions: { onSearch: (value: string) => void; onOpen: (id: number) => void; onRetry: () => void };
  };

  const STATUS_TONES = { active: 'success', maintenance: 'warning', deprecated: 'neutral' } as const;
</script>

<script lang="ts">
  import CodeXml from '@lucide/svelte/icons/code-xml';
  import SearchX from '@lucide/svelte/icons/search-x';
  import { softwareProjectStatusLabel } from '@template/shared/domain/software-project.util';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import PaginationBar from '$lib/components/azuos-pagination-bar/azuos-pagination-bar.svelte';
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
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
  import TableViewToggle from '$lib/components/azuos-table-view-toggle/azuos-table-view-toggle.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { useCardPage } from '$lib/hooks/use-card-page/use-card-page.svelte';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { cn } from '$lib/utils/cn';
  import { formatDate } from '$lib/utils/format-date';

  let { data, state: viewState, actions }: AzuosSupportSystemsViewProps = $props();
  /* A grade de cards pagina; a tabela rola inteira (padrão do grupo). */
  const cardPage = useCardPage(() => data.systems);
  const tableView = useTableViewModel();

  function lastMoveOf(system: SupportSystem): string {
    return system.lastActivityAt
      ? `Último movimento em ${formatDate(system.lastActivityAt)}`
      : 'Sem movimento no GitHub ainda';
  }
</script>

<section aria-label="Andamento dos sistemas" class="flex flex-col gap-6">
  <PageHeader
    data={{
      title: 'Sistemas',
      description:
        'O que está em andamento em cada sistema. Confira antes de abrir um chamado: pode ser que já estejam cuidando disso.',
    }}
  />

  <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
    <div class="min-w-0 flex-1">
      <TextField
        data={{ label: 'Buscar', name: 'systemSearch', value: data.search, placeholder: 'Nome do sistema ou para que serve' }}
        actions={{ onChange: actions.onSearch }}
      />
    </div>
    <TableViewToggle />
  </div>

  {#if viewState?.error}
    <ErrorState data={{ message: viewState.error }} actions={{ onRetry: actions.onRetry }} />
  {:else if viewState?.isLoading}
    <!-- O esqueleto tem a FORMA da grade: sem isso, a tela pula quando o conteúdo chega. -->
    <div class="card-grid" role="status" aria-busy="true" aria-label="Carregando os sistemas">
      {#each [0, 1, 2] as index (index)}
        <div class="bg-card shadow-card rounded-surface flex flex-col gap-3 p-4">
          <Skeleton class="h-3 w-1/4" />
          <Skeleton class="h-4 w-2/3" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="mt-4 h-6 w-1/2" />
        </div>
      {/each}
    </div>
  {:else if data.systems.length === 0}
    <EmptyState
      data={{
        title: data.total === 0 ? 'Nenhum sistema cadastrado' : 'Nenhum sistema com esse nome',
        description: data.total === 0 ? 'Quando o time cadastrar os sistemas, eles aparecem aqui.' : 'Confira a busca.',
      }}
      ui={{ icon: SearchX }}
    />
  {:else}
    <!-- 1. Cards: sempre no estreito (< xl), ou quando a pessoa pediu cards. A grade pagina. -->
    <ul class={cn('card-grid', !tableView.forceCards && 'xl:hidden')} aria-label="Sistemas" data-slot="support-system-cards">
      {#each cardPage.items as system (system.id)}
        <li class="flex">
          <ContentCard
            data={{
              label: `Ver o andamento de ${system.name}`,
              title: system.name,
              meta: system.description,
              status: { label: softwareProjectStatusLabel(system.status), tone: STATUS_TONES[system.status] },
              metrics: [
                { key: 'tickets', label: 'Chamados abertos', value: String(system.openTickets), tone: 'red', isOn: system.openTickets > 0 },
                { key: 'issues', label: 'Issues abertas', value: String(system.openIssues), tone: 'green', isOn: system.openIssues > 0 },
              ],
              footer: { title: lastMoveOf(system) },
              openLabel: 'Ver o mapa',
            }}
            ui={{ icon: CodeXml, iconTone: 'blue', className: 'w-full', slot: 'support-system-card' }}
            actions={{ onOpen: () => actions.onOpen(system.id) }}
          />
        </li>
      {/each}
    </ul>
    {#if cardPage.total > cardPage.pageSize}
      <div class={cn('flex justify-center', !tableView.forceCards && 'xl:hidden')}>
        <PaginationBar
          data={{
            page: cardPage.page,
            pageSize: cardPage.pageSize,
            total: cardPage.total,
            noun: ['sistema', 'sistemas'],
          }}
          actions={{ onPageChange: cardPage.actions.onPageChange }}
        />
      </div>
    {/if}

    <!-- 2. Tabela: só quando a tela cabe (>= xl) E a pessoa não preferiu cards. Rola inteira. -->
    <div
      class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
      data-slot="support-system-table"
    >
      <Table class="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead>Sistema</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Chamados abertos</TableHead>
            <TableHead>Issues abertas</TableHead>
            <TableHead>Último movimento</TableHead>
            <TableHead class="text-right"><span class="sr-only">Ações</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each data.systems as system (system.id)}
            <TableRow class="align-top">
              <TableCell>
                <span class="text-foreground block font-medium">{system.name}</span>
                {#if system.description}
                  <span class="text-muted-foreground block text-xs break-words">{system.description}</span>
                {/if}
              </TableCell>
              <TableCell>
                <StatusBadge
                  data={{ label: softwareProjectStatusLabel(system.status) }}
                  ui={{ tone: STATUS_TONES[system.status], size: 'sm' }}
                />
              </TableCell>
              <TableCell class="tabular-nums">{system.openTickets}</TableCell>
              <TableCell class="tabular-nums">{system.openIssues}</TableCell>
              <TableCell class="text-muted-foreground text-xs">{lastMoveOf(system)}</TableCell>
              <TableCell class="text-right">
                <TableActions>
                  <ActionButton
                    data={{ label: 'Ver o mapa' }}
                    ui={{ variant: 'ghost', size: 'sm' }}
                    actions={{ onClick: () => actions.onOpen(system.id) }}
                  />
                </TableActions>
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  {/if}
</section>
