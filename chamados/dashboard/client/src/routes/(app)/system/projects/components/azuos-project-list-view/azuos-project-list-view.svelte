<!--
  @component
  OS SISTEMAS E PROJETOS da empresa: a tela de lista do módulo Sistema.

  Cabeçalho com "Sincronizar todos" (só com `canSyncAll`) e "Novo sistema" (só para quem edita);
  a barra com busca, situação e o modo de ver (Lista ou Mapa; a lista em tabela ou cards pela troca
  do sistema). Cada sistema é o cartão de registro (`AzuosContentCard`) ou a linha da
  `AzuosProjectTable`: situação na faixa, nome, link do repositório no GitHub (abre em nova aba),
  descrição, chamados e PRs abertos e o responsável (ou "Sem responsável"). O card inteiro abre a
  página do sistema ("Ver sistema"); no menu de três pontinhos, "Sincronizar" (com `canSync`) e,
  para quem edita, "Editar" e "Excluir".
  Excluir pergunta antes; o sistema vai para "Removidos", onde dá para desfazer. Tem os estados de
  carregando (esqueletos), erro, vazio e filtrado sem resultado, e os avisos da sincronização.

  Função pura de props: não busca nada e não navega.

  - `data`: `items`, `total`, `filter` e `deleting` (o que espera confirmação).
  - `state`: permissões (`canEdit`, `canSync`, `canSyncAll`), lista (`isLoading`, `isRefetching`,
    `isEmpty`, `isFilteredOut`, `error`), exclusão (`isDeleting`, `deleteError`) e sincronização
    (`isSyncing`, `isSyncingAll`, `syncMessage`, `syncError`).
  - `actions`: filtros (`onSearchChange`, `onStatusChange`, `onClearFilters`), `onRetry`,
    `onRegister`, `onEdit`, `onViewTimeline`, exclusão (`onAskDelete`, `onCancelDelete`,
    `onConfirmDelete`), `onSyncGithub(id)` e `onSyncAllGithub`.
-->
<script lang="ts" module>
  import type { Snippet } from 'svelte';
  import {
    softwareProjectStatusLabel,
    type SoftwareProjectStatus,
  } from '@template/shared/domain/software-project.util';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
  import { type SoftwareProjectListFilter } from '$lib/hooks/use-software-project-list/use-software-project-list.svelte';

  export type AzuosProjectListViewProps = {
    data: {
      items: SoftwareProject[];
      total: number;
      filter: SoftwareProjectListFilter;
      deleting: SoftwareProject | null;
      /** Cards (a grade) ou Mapa (cada sistema numa ilha com issues, PRs, chamados e tarefas). */
      view?: 'cards' | 'map';
    };
    state: {
      canEdit?: boolean;
      /** Quem tem o GitHub vinculado vê o "Sincronizar todos". */
      canSyncAll?: boolean;
      /** Quem tem o GitHub vinculado sincroniza cada sistema — qualquer papel, e só esses. */
      canSync?: boolean;
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isDeleting: boolean;
      isSyncing: boolean;
      isSyncingAll?: boolean;
      error: string | null;
      deleteError: string | null;
      syncMessage: string | null;
      syncError?: string | null;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onStatusChange: (status: SoftwareProjectStatus | '') => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onRegister: () => void;
      onEdit: (item: SoftwareProject) => void;
      onViewTimeline: (item: SoftwareProject) => void;
      onAskDelete: (item: SoftwareProject) => void;
      onCancelDelete: () => void;
      onConfirmDelete: () => void;
      onSyncGithub: (id: number) => void;
      onSyncAllGithub?: () => void;
      onViewChange?: (view: 'cards' | 'map') => void;
    };
    /** O mapa dos projetos, já montado pela tela: aparece no lugar dos cards na visão Mapa. */
    map?: Snippet;
  };

</script>

<script lang="ts">
  import Code2 from '@lucide/svelte/icons/code-2';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import CollapsibleFilters from '$lib/components/azuos-collapsible-filters/azuos-collapsible-filters.svelte';
  import FilterField from '$lib/components/azuos-filter-field/azuos-filter-field.svelte';
  import ListToolbar from '$lib/components/azuos-list-toolbar/azuos-list-toolbar.svelte';
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
  import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';
  import { cn } from '$lib/utils/cn';
  import ProjectTable, {
    projectStatusTone,
    repositoryHrefOf,
    repositoryLabelOf,
  } from '../azuos-project-table/azuos-project-table.svelte';
  import { useCardPage } from '$lib/hooks/use-card-page/use-card-page.svelte';
  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import ConfirmDialog from '$lib/components/azuos-confirm-dialog/azuos-confirm-dialog.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import PageHeader from '$lib/components/azuos-page-header/azuos-page-header.svelte';
  import SegmentedControl from '$lib/components/azuos-segmented-control/azuos-segmented-control.svelte';
  import SelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import ContentCard, {
    type AzuosContentCardMenuItem,
  } from '$lib/components/azuos-content-card/azuos-content-card.svelte';

  let { data, state, actions, map }: AzuosProjectListViewProps = $props();

  /* "Lista" é a tabela ou a grade de cards (a troca do sistema, ao lado); "Mapa", o desenho. */
  const VIEW_OPTIONS = [
    { value: 'cards', label: 'Lista' },
    { value: 'map', label: 'Mapa' },
  ];
  const tableView = useTableViewModel();
  /* A grade de cards pagina no navegador: a lista chega inteira (até o teto da consulta). */
  const cardPage = useCardPage(() => data.items);

  /* O menu do card: sincronizar é de quem tem o GitHub vinculado; corrigir e excluir, de quem edita. */
  const menuItems = $derived<AzuosContentCardMenuItem[]>([
    ...((state.canSync ?? state.canEdit !== false)
      ? [{ id: 'sync', label: state.isSyncing ? 'Sincronizando…' : 'Sincronizar', icon: RefreshCw }]
      : []),
    ...(state.canEdit !== false
      ? [
          { id: 'edit', label: 'Editar', icon: Pencil, separatorBefore: true },
          { id: 'delete', label: 'Excluir', icon: Trash2, isDestructive: true },
        ]
      : []),
  ]);

  function chooseAction(id: string, project: SoftwareProject) {
    if (id === 'sync') return actions.onSyncGithub(project.id);
    if (id === 'delete') return actions.onAskDelete(project);

    actions.onEdit(project);
  }

  const statusFilterOptions = [
    { value: '', label: 'Todas as situações' },
    { value: 'active', label: 'Ativo' },
    { value: 'maintenance', label: 'Manutenção' },
    { value: 'deprecated', label: 'Legado / Descontinuado' },
  ];
</script>

<div class="flex w-full flex-col gap-6">
  <PageHeader
    data={{
      title: 'Sistemas e Projetos',
      description:
        'Cadastre os softwares da empresa, acompanhe Pull Requests e vincule chamados de suporte.',
    }}
  >
    {#if state.canSyncAll}
      <ActionButton
        data={{ label: 'Sincronizar todos', loadingLabel: 'Sincronizando…' }}
        ui={{ variant: 'secondary', icon: RefreshCw }}
        state={{ isLoading: state.isSyncingAll, isDisabled: state.isSyncingAll }}
        actions={{ onClick: actions.onSyncAllGithub }}
      />
    {/if}
    {#if state.canEdit !== false}
      <ActionButton
        data={{ label: 'Novo sistema' }}
        ui={{ variant: 'primary', icon: Plus }}
        actions={{ onClick: actions.onRegister }}
      />
    {/if}
  </PageHeader>

  {#if state.syncMessage}
    <div role="status" class="rounded-box bg-success-soft text-success p-4 text-xs font-medium">
      {state.syncMessage}
    </div>
  {/if}

  {#if state.syncError}
    <ErrorState data={{ message: state.syncError }} ui={{ variant: 'inline' }} />
  {/if}

  <!-- O cartão de filtros do grupo (o de Empresas do paralegal): a busca e a situação à vista; na
       faixa de baixo, o modo de ver (cards ou mapa). No mapa, a busca e a situação não se aplicam. -->
  <CollapsibleFilters
    data={{ label: 'Filtros dos sistemas', activeCount: 0 }}
    state={{ hasFilter: data.view !== 'map' && Boolean(data.filter.search || data.filter.status) && !state.isFilteredOut }}
    actions={{ onClear: actions.onClearFilters }}
    toggles={actions.onViewChange && map ? viewToggles : undefined}
  >
    {#snippet primary()}
      {#if data.view !== 'map'}
        <TextField
          data={{
            label: 'Buscar',
            name: 'search',
            value: data.filter.search,
            placeholder: 'Buscar por nome ou repositório…',
          }}
          actions={{ onChange: actions.onSearchChange }}
        />
        <FilterField data={{ label: 'Situação' }} ui={{ className: 'sm:w-full' }}>
          <SelectField
            data={{ value: data.filter.status, options: statusFilterOptions }}
            ui={{ ariaLabel: 'Filtrar por situação', placeholder: 'Todas as situações', className: 'w-full' }}
            actions={{ onChange: (val) => actions.onStatusChange(val as SoftwareProjectStatus | '') }}
          />
        </FilterField>
      {/if}
    {/snippet}
  </CollapsibleFilters>

  {#snippet viewToggles()}
    <span class="text-muted-foreground text-sm font-medium">Ver</span>
    <SegmentedControl
      data={{ value: data.view ?? 'cards', options: VIEW_OPTIONS }}
      ui={{ ariaLabel: 'Modo de ver os sistemas' }}
      actions={{ onChange: (value: string) => actions.onViewChange?.(value as 'cards' | 'map') }}
    />
  {/snippet}

  <!-- A barra da lista: cards ou tabela à esquerda; à direita as páginas (cards) ou a contagem
       (tabela, que rola inteira). -->
  {#if data.view !== 'map' && !state.isLoading && !state.error && !state.isEmpty}
    {@render listToolbar('top')}
  {/if}

  {#if data.view === 'map' && map}
    {@render map()}
  {:else}
  {#if state.isLoading}
    <div class="card-grid" aria-busy="true" aria-label="Carregando os sistemas">
      {#each [0, 1, 2] as idx (idx)}
        <div class="bg-card shadow-card rounded-surface flex flex-col gap-3 p-4">
          <Skeleton class="h-3 w-1/4" />
          <Skeleton class="h-4 w-2/3" />
          <Skeleton class="h-3 w-full" />
          <Skeleton class="mt-4 h-6 w-1/2" />
        </div>
      {/each}
    </div>
  {:else if state.error}
    <ErrorState
      data={{
        title: 'Não foi possível carregar os sistemas',
        message: state.error,
      }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if state.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhum sistema cadastrado',
        description:
          state.canEdit === false
            ? 'Aguarde um administrador cadastrar os sistemas da equipe.'
            : 'Cadastre seu primeiro sistema para acompanhar Pull Requests e chamados.',
      }}
    >
      {#if state.canEdit !== false}
        <ActionButton
          data={{ label: 'Cadastrar sistema' }}
          ui={{ variant: 'primary', icon: Plus }}
          actions={{ onClick: actions.onRegister }}
        />
      {/if}
    </EmptyState>
  {:else if state.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhum sistema encontrado',
        description: 'Nenhum resultado corresponde aos filtros aplicados.',
      }}
    >
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    </EmptyState>
  {:else}
    <!-- A grade padrão de cards: cada sistema é o cartão de registro, e o card inteiro abre a
         página dele ("Ver sistema"). Sincronizar, corrigir e excluir moram no menu. -->
    <div class={cn('card-grid', !tableView.forceCards && 'xl:hidden')} data-slot="project-cards">
      {#each cardPage.items as project (project.id)}
        <ContentCard
          data={{
            label: `Ver sistema ${project.name}`,
            title: project.name,
            code: repositoryLabelOf(project),
            codeHref: repositoryHrefOf(project),
            status: {
              label: softwareProjectStatusLabel(project.status),
              tone: projectStatusTone(project),
            },
            metrics: [
              {
                key: 'tickets',
                label: 'Chamados',
                value: String(project.openTicketsCount),
                tone: 'blue',
                isOn: project.openTicketsCount > 0,
              },
              {
                key: 'prs',
                label: 'PRs',
                value: String(project.pullRequestsCount),
                tone: 'plum',
                isOn: project.pullRequestsCount > 0,
              },
            ],
            /* Quem responde pelo sistema. Sem ninguém, diz isso: espaço vazio pareceria erro. */
            footer: {
              title: project.responsibleName ?? 'Sem responsável',
              subtitle: 'Responsável',
              person: project.responsibleName
                ? { id: project.responsibleId, name: project.responsibleName }
                : null,
            },
            openLabel: 'Ver sistema',
            menu: { label: `Ações de ${project.name}`, items: menuItems },
          }}
          ui={{ icon: Code2, iconTone: 'blue', slot: 'project-card' }}
          state={{ isMenuDisabled: state.isSyncing }}
          actions={{
            onOpen: () => actions.onViewTimeline(project),
            onMenuSelect: (id) => chooseAction(id, project),
          }}
        >
          {#snippet body()}
            <p class="text-muted-foreground line-clamp-2 text-xs">
              {project.description || 'Sem descrição cadastrada.'}
            </p>
          {/snippet}
        </ContentCard>
      {/each}
    </div>
    <!-- A tabela: só quando a tela cabe (>= xl) E a pessoa não preferiu cards. Rola inteira. -->
    <div class={cn('hidden', !tableView.forceCards && 'xl:block')} data-slot="project-table">
      <ProjectTable
        data={{ items: data.items, menuItems }}
        state={{ isMenuDisabled: state.isSyncing }}
        actions={{ onOpen: actions.onViewTimeline, onMenuSelect: chooseAction }}
      />
    </div>
    <!-- No pé dos cards, a mesma barra de páginas. Na tabela, que rola inteira, ela não aparece. -->
    {@render listToolbar('bottom')}
  {/if}
  {/if}

  <!-- Confirmação de Exclusão -->
  {#if data.deleting}
    <ConfirmDialog
      data={{
        title: 'Excluir sistema',
        description: `"${data.deleting.name}" sai da lista, com a linha do tempo e os chamados guardados. Ele fica em "Removidos", onde dá para desfazer.`,
        confirmLabel: 'Excluir',
      }}
      ui={{ tone: 'danger' }}
      state={{
        isOpen: true,
        isConfirming: state.isDeleting,
        error: state.deleteError,
      }}
      actions={{
        onConfirm: actions.onConfirmDelete,
        onCancel: actions.onCancelDelete,
      }}
    />
  {/if}
</div>

{#snippet listToolbar(position: 'top' | 'bottom')}
  <ListToolbar
    data={{
      scroll: { loaded: data.items.length, totalItems: data.items.length },
      pages: { page: cardPage.page, pageSize: cardPage.pageSize, totalItems: cardPage.total },
      noun: ['sistema', 'sistemas'],
    }}
    ui={{ position }}
    actions={{ onPageChange: cardPage.actions.onPageChange }}
  />
{/snippet}
