<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import FolderCode from '@lucide/svelte/icons/folder-code';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import { useSoftwareProjectDetailModel } from '$lib/hooks/use-software-project-detail/use-software-project-detail.svelte';
  import ProjectDetailView from '../components/azuos-project-detail-view/azuos-project-detail-view.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * Uma ROTA, e não um modal sobre a lista: o gestor guarda e manda o endereço do sistema
   * ("olha como está o Portal"), e um modal não tem endereço.
   */
  const detail = useSoftwareProjectDetailModel(Number(page.params.id));
</script>

<svelte:head>
  <title>{detail.data.project?.name ?? 'Sistema'}</title>
</svelte:head>

<!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
{#if detail.state.isMissing}
  <div class="mx-auto w-full max-w-3xl">
    <EmptyState
      data={{ title: 'Sistema não encontrado', description: 'Ele pode ter sido excluído.' }}
      ui={{ icon: FolderCode }}
    >
      <ActionButton
        data={{ label: 'Voltar para os projetos' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: () => goto('/system/projects') }}
      />
    </EmptyState>
  </div>
{:else if detail.state.error}
  <div class="mx-auto w-full max-w-3xl">
    <ErrorState
      data={{ title: 'Não consegui carregar o sistema', message: detail.state.error }}
      actions={{ onRetry: detail.actions.onRetry }}
    />
  </div>
{:else if detail.state.isLoading || !detail.data.project}
  <p class="text-ink-500 py-10 text-center text-sm">Carregando o sistema…</p>
{:else}
  <ProjectDetailView
    data={{ ...detail.data, project: detail.data.project }}
    state={detail.state}
    actions={{
      onFilterChange: detail.actions.onFilterChange,
      onSync: detail.actions.onSync,
      onBack: () => goto('/system/projects'),
      onOpenTicket: (ticket) => goto(`/system/tickets/${ticket.id}`),
    }}
  />
{/if}
