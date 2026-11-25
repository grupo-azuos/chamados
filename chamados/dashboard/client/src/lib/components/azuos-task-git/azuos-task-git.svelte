<!--
  @component
  AS BRANCHES DA TAREFA DE SISTEMA — as do sistema do chamado dela cujo nome leva a tarefa, o
  chamado ou a issue (`feature/tarefa-42-…`, `feature/CH-0056-…`, `feature/85-…`), cada uma na cor do
  git-flow e abrindo no GitHub; a nova pulsa tracejada. Embaixo, o git graph do sistema, os commits
  mais recentes, no desenho do lazygit.

  - `data.git`: o que a API devolve (`GET /tasks/:id/git`).
  - `data.now`: o agora, para saber o que é novo (os testes fixam).
-->
<script lang="ts" module>
  /** Quantos commits o grafo da tarefa mostra: o começo da história, o resto está no mapa. */
  export const TASK_GIT_ROWS = 30;

  /** O endereço da branch no GitHub: o cadastro guarda `org/repo` ou a URL inteira. */
  export function branchUrl(repositoryUrl: string, branch: string): string {
    const base = /^https?:\/\//.test(repositoryUrl)
      ? repositoryUrl.replace(/\/$/, '')
      : `https://github.com/${repositoryUrl}`;

    return `${base}/tree/${branch}`;
  }
</script>

<script lang="ts">
  import GitBranch from '@lucide/svelte/icons/git-branch';
  import { type TaskGit } from '@template/shared/schemas/task-git.schema';

  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import GitGraph from '$lib/components/azuos-git-graph/azuos-git-graph.svelte';
  import { cardToneClasses } from '$lib/utils/card-tone.util';
  import { cn } from '$lib/utils/cn';
  import { buildGitGraph, categoryOfBranch, GIT_CATEGORY_HUES } from '$lib/utils/git-graph.util';

  let { data }: { data: { git: TaskGit; now?: Date } } = $props();

  const NEW_HOURS = 48;
  const now = $derived(data.now ?? new Date());
  const own = $derived(data.git.branches.filter((branch) => branch.isOfTask));
  const rows = $derived(buildGitGraph(data.git.commits, data.git.branches, {}, now).slice(0, TASK_GIT_ROWS));
  const isNew = (firstSeenAt: string) => now.getTime() - Date.parse(firstSeenAt) < NEW_HOURS * 3_600_000;
</script>

{#if !data.git.project}
  <EmptyState
    data={{ title: 'Sem sistema', description: 'A tarefa não veio de um chamado de sistema: não há branches para mostrar.' }}
    ui={{ icon: GitBranch }}
  />
{:else}
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <p class="text-muted-foreground text-sm font-medium">Desta tarefa, em {data.git.project.name}</p>
      {#if own.length === 0}
        <p class="text-muted-foreground text-sm">
          Nenhuma branch leva no nome o número desta tarefa, do chamado ou da issue. Ex.: feature/tarefa-42-tela.
        </p>
      {:else}
        <ul aria-label="Branches desta tarefa" class="flex flex-wrap gap-2">
          {#each own as branch (branch.name)}
            <li>
              <a
                href={branchUrl(data.git.project.repositoryUrl, branch.name)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={isNew(branch.firstSeenAt) ? `Branch nova: ${branch.name}` : branch.name}
                class={cn(
                  'rounded-chip inline-flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-medium hover:underline',
                  cardToneClasses(GIT_CATEGORY_HUES[categoryOfBranch(branch.name)]).dot,
                  isNew(branch.firstSeenAt) && 'outline-foreground outline-2 outline-offset-1 outline-dashed motion-safe:animate-pulse',
                )}
              >
                <GitBranch class="size-3.5" aria-hidden="true" />{branch.name}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
    <div class="flex flex-col gap-1 border-t pt-3">
      <p class="text-muted-foreground text-sm font-medium">Commits do sistema</p>
      <GitGraph data={{ rows }} />
    </div>
  </div>
{/if}
