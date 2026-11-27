<script lang="ts">
  import LoadingState from '$lib/components/azuos-loading-state/azuos-loading-state.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import FolderCode from '@lucide/svelte/icons/folder-code';


  import BackButton from '$lib/components/azuos-back-button/azuos-back-button.svelte';
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import { useBackTarget } from '$lib/hooks/use-navigation-stack/use-navigation-stack.svelte';
  import { useSoftwareProjectDetailModel } from '$lib/hooks/use-software-project-detail/use-software-project-detail.svelte';
  import ProjectDetailView from '../components/azuos-project-detail-view/azuos-project-detail-view.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * Uma ROTA, e não um modal sobre a lista: o gestor guarda e manda o endereço do sistema
   * ("olha como está o Portal"), e um modal não tem endereço.
   */
  const detail = useSoftwareProjectDetailModel(Number(page.params.id));
  /* O voltar leva à tela de onde a pessoa veio, e sem caminho à lista de projetos. */
  const back = useBackTarget({ to: '/system/projects', destination: 'os projetos' });
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
      <BackButton data={{ destination: back.destination }} actions={{ onClick: back.onBack }} />
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
  <LoadingState data={{ label: 'Carregando o sistema…' }} />
{:else}
  <ProjectDetailView
    data={{ ...detail.data, project: detail.data.project, backDestination: back.destination }}
    state={detail.state}
    actions={{
      onFilterChange: detail.actions.onFilterChange,
      onSync: detail.actions.onSync,
      onBack: back.onBack,
      onOpenTicket: (ticket) => goto(`/system/tickets/${ticket.id}`),
    }}
  />
{/if}
