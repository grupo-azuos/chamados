<!--
  @component
  OS SISTEMAS EM TABELA — a `AzuosTable` da casa, o par da grade de cards na troca tabela/cards do
  sistema (`AzuosTableViewToggle`). As mesmas informações do card: o nome (que abre a página do
  sistema), o repositório (abre o GitHub em nova aba), a situação, os chamados e PRs abertos e o
  responsável com a foto. Sincronizar, editar e excluir ficam no menu de três pontinhos da linha —
  o mesmo do card, recebido pronto em `data.menuItems`.

  - `data`: `items` e os itens do menu.
  - `state.isMenuDisabled`: trava o menu enquanto sincroniza.
  - `actions`: `onOpen` (a página do sistema) e `onMenuSelect`.
-->
<script lang="ts" module>
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';

  import { type AzuosContentCardMenuItem } from '$lib/components/azuos-content-card/azuos-content-card.svelte';
  import { type StatusBadgeTone } from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';

  export type AzuosProjectTableProps = {
    data: {
      items: SoftwareProject[];
      menuItems: AzuosContentCardMenuItem[];
    };
    state?: { isMenuDisabled?: boolean };
    actions: {
      onOpen: (project: SoftwareProject) => void;
      onMenuSelect: (id: string, project: SoftwareProject) => void;
    };
  };

  /** "dono/repositório" quando o GitHub já respondeu; senão, o endereço como foi cadastrado. */
  export function repositoryLabelOf(project: SoftwareProject): string {
    return project.githubRepoOwner
      ? `${project.githubRepoOwner}/${project.githubRepoName}`
      : project.repositoryUrl;
  }

  /** O link do repositório: o endereço cadastrado, ou o do GitHub quando veio só "dono/nome". */
  export function repositoryHrefOf(project: SoftwareProject): string {
    return project.repositoryUrl.startsWith('http')
      ? project.repositoryUrl
      : `https://github.com/${project.repositoryUrl}`;
  }

  const STATUS_TONES: Record<string, StatusBadgeTone> = {
    active: 'success',
    maintenance: 'warning',
    deprecated: 'neutral',
  };

  /** O tom da situação do sistema — o mesmo na faixa do card e no selo da tabela. */
  export function projectStatusTone(project: SoftwareProject): StatusBadgeTone {
    return STATUS_TONES[project.status] ?? 'neutral';
  }
</script>

<script lang="ts">
  import { softwareProjectStatusLabel } from '@template/shared/domain/software-project.util';

  import ActionMenu from '$lib/components/azuos-action-menu/azuos-action-menu.svelte';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import StatusBadge from '$lib/components/azuos-status-badge/azuos-status-badge.svelte';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/azuos-table/azuos-table';

  let { data, state: tableState, actions }: AzuosProjectTableProps = $props();
</script>

<Table class="min-w-[880px]" aria-label="Lista de sistemas">
  <TableHeader>
    <TableRow>
      <TableHead>Sistema</TableHead>
      <TableHead class="w-36">Situação</TableHead>
      <TableHead class="w-28 text-right">Chamados</TableHead>
      <TableHead class="w-24 text-right">PRs</TableHead>
      <TableHead class="w-56">Responsável</TableHead>
      <TableHead class="w-14 text-right"><span class="sr-only">Ações</span></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each data.items as project (project.id)}
      <TableRow>
        <TableCell>
          <button
            type="button"
            aria-label={`Ver sistema ${project.name}`}
            class="text-foreground hover:text-primary focus-visible:ring-ring/50 rounded-control text-left font-medium break-words hover:underline focus-visible:ring-3 focus-visible:outline-none"
            onclick={() => actions.onOpen(project)}
          >
            {project.name}
          </button>
          <a
            href={repositoryHrefOf(project)}
            target="_blank"
            rel="noopener noreferrer"
            class="text-muted-foreground hover:text-foreground block truncate font-mono text-xs hover:underline"
          >
            {repositoryLabelOf(project)}
          </a>
        </TableCell>
        <TableCell>
          <StatusBadge
            data={{ label: softwareProjectStatusLabel(project.status) }}
            ui={{ tone: projectStatusTone(project), size: 'sm' }}
          />
        </TableCell>
        <TableCell class="text-right tabular-nums">{project.openTicketsCount}</TableCell>
        <TableCell class="text-right tabular-nums">{project.pullRequestsCount}</TableCell>
        <TableCell>
          {#if project.responsibleName}
            <span class="flex min-w-0 items-center gap-2">
              <PersonAvatar name={project.responsibleName} personId={project.responsibleId} ui={{ size: 'sm' }} />
              <span class="truncate">{project.responsibleName}</span>
            </span>
          {:else}
            <span class="text-muted-foreground">Sem responsável</span>
          {/if}
        </TableCell>
        <TableCell class="text-right">
          {#if data.menuItems.length > 0}
            <ActionMenu
              data={{ label: `Ações de ${project.name}`, items: data.menuItems }}
              ui={{ isIconOnly: true }}
              state={{ isDisabled: tableState?.isMenuDisabled }}
              actions={{ onSelect: (id) => actions.onMenuSelect(id, project) }}
            />
          {/if}
        </TableCell>
      </TableRow>
    {/each}
  </TableBody>
</Table>
