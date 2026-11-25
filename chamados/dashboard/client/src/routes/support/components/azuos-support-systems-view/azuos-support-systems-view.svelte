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

  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import LoadingState from '$lib/components/azuos-loading-state/azuos-loading-state.svelte';
  import ContentCard from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';
  import { formatDate } from '$lib/utils/format-date';

  let { data, state: viewState, actions }: AzuosSupportSystemsViewProps = $props();
</script>

<section aria-label="Andamento dos sistemas" class="flex flex-col gap-6">
  <header class="flex flex-col gap-1">
    <h1 class="text-foreground text-2xl font-bold">Sistemas</h1>
    <p class="text-muted-foreground text-sm">
      O que está em andamento em cada sistema. Confira antes de abrir um chamado: pode ser que já estejam
      cuidando disso.
    </p>
  </header>

  <TextField
    data={{ label: 'Buscar', name: 'systemSearch', value: data.search, placeholder: 'Nome do sistema ou para que serve' }}
    actions={{ onChange: actions.onSearch }}
  />

  {#if viewState?.error}
    <ErrorState data={{ message: viewState.error }} actions={{ onRetry: actions.onRetry }} />
  {:else if viewState?.isLoading}
    <LoadingState data={{ label: 'Carregando os sistemas…' }} />
  {:else if data.systems.length === 0}
    <EmptyState
      data={{
        title: data.total === 0 ? 'Nenhum sistema cadastrado' : 'Nenhum sistema com esse nome',
        description: data.total === 0 ? 'Quando o time cadastrar os sistemas, eles aparecem aqui.' : 'Confira a busca.',
      }}
      ui={{ icon: SearchX }}
    />
  {:else}
    <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Sistemas">
      {#each data.systems as system (system.id)}
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
              footer: {
                title: system.lastActivityAt ? `Último movimento em ${formatDate(system.lastActivityAt)}` : 'Sem movimento no GitHub ainda',
              },
              openLabel: 'Ver o mapa',
            }}
            ui={{ icon: CodeXml, iconTone: 'blue', className: 'w-full', slot: 'support-system-card' }}
            actions={{ onOpen: () => actions.onOpen(system.id) }}
          />
        </li>
      {/each}
    </ul>
  {/if}
</section>
