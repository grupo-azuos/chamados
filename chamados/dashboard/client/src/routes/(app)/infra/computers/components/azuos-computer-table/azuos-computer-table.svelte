<!--
  @component
  A MESMA LISTA DA GRADE, EM LINHAS — no formato da tabela de empresas do Paralegal, sobre a
  `AzuosTable` da casa.

  A grade responde "onde está a máquina X"; a tabela responde "como está o parque inteiro":
  comparar saúde, manutenção e chamados entre máquinas exige que fiquem alinhados em coluna.

  - A LINHA INTEIRA abre a ficha (o clique é da linha, em qualquer célula); o nome também é um
    botão, para quem navega no teclado. O hover é o véu neutro da linha, sem cor.
  - O SELO que pisca (`AzuosComputerAlertBadge`) fica antes do nome: alerta crítico aberto ou
    preventiva vencida. Sem pendência, o espaço fica, para os nomes se alinharem.
  - Os cabeçalhos de Máquina, Responsável, Saúde, Chamados e Vista ORDENAM: a seta diz o estado
    sem clicar (`⇅` parada, `▲`/`▼` em uso) e o `aria-sort` diz o mesmo ao leitor de tela.
  - A ação da linha mora no menu de três pontinhos.

  Função pura de props.

  - `data`: `computers`, `sort` (a ordem em vigor) e `scheduledFor` (o dia agendado, pelo id).
  - `actions`: `onOpen(computer)` e `onSortChange(field)` — sem ele, os cabeçalhos não ordenam.
-->
<script lang="ts" module>
  import { type ComputerListItem } from '@template/shared/schemas/computer.schema';

  export type ComputerTableSortField = 'number' | 'responsible' | 'health' | 'tickets' | 'lastSeen';

  export type ComputerTableSort = { field: ComputerTableSortField; direction: 'asc' | 'desc' };

  export type AzuosComputerTableProps = {
    data: {
      computers: ComputerListItem[];
      sort?: ComputerTableSort;
      scheduledFor?: Record<number, string>;
    };
    actions: {
      onOpen: (computer: ComputerListItem) => void;
      onSortChange?: (field: ComputerTableSortField) => void;
    };
  };

  /** O `aria-sort` da coluna: só a que está ordenando diz a direção. */
  export function ariaSortOf(
    sort: ComputerTableSort | undefined,
    field: ComputerTableSortField,
  ): 'ascending' | 'descending' | 'none' {
    if (sort?.field !== field) return 'none';

    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }
</script>

<script lang="ts">
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import Eye from '@lucide/svelte/icons/eye';
  import {
    healthStatusLabel,
    healthStatusTone,
  } from '@template/shared/domain/computer-health.util';
  import { computerDepartmentLabel, computerResponsibleLabel } from '$lib/utils/computer-place.util';

  import ActionMenu from '$lib/components/azuos-action-menu/azuos-action-menu.svelte';
  import AlertBadge, {
    computerPendingOf,
  } from '../azuos-computer-alert-badge/azuos-computer-alert-badge.svelte';
  import {
    displayNameOf,
    HEALTH_CLASSES,
    situationOf,
  } from '../azuos-computer-card/azuos-computer-card.svelte';
  import UpgradeBadge from '../azuos-computer-upgrade-badge/azuos-computer-upgrade-badge.svelte';
  import ComputerMaintenanceStatus from '../azuos-computer-maintenance-status/azuos-computer-maintenance-status.svelte';
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
  import { cn } from '$lib/utils/cn';
  import { formatTimeAgo } from '$lib/utils/format-machine';

  let { data, actions }: AzuosComputerTableProps = $props();

  /* Cabeçalho em frase, e não em caixa alta espaçada (padrão Apple, `apple/sentence-case-labels`). */
  const HEAD = 'normal-case tracking-normal';

  const ROW_MENU = [{ id: 'open', label: 'Ver ficha', icon: Eye }];
</script>

{#snippet sortable(field: ComputerTableSortField, label: string)}
  {@const isActive = data.sort?.field === field}
  {#if actions.onSortChange}
    {@const onSortChange = actions.onSortChange}
    <button
      type="button"
      onclick={() => onSortChange(field)}
      title="Clique para ordenar"
      class={cn(
        'hover:text-foreground inline-flex items-center gap-1 transition-colors',
        isActive && 'text-foreground',
      )}
    >
      {label}
      {#if !isActive}
        <ArrowUpDown size={12} aria-hidden="true" class="opacity-40" />
      {:else if data.sort?.direction === 'asc'}
        <ArrowUp size={12} aria-hidden="true" />
      {:else}
        <ArrowDown size={12} aria-hidden="true" />
      {/if}
    </button>
  {:else}
    {label}
  {/if}
{/snippet}

<Table class="min-w-[1080px]">
  <TableHeader>
    <TableRow>
      <TableHead class={cn(HEAD, 'min-w-[260px]')} aria-sort={ariaSortOf(data.sort, 'number')}>
        {@render sortable('number', 'Máquina')}
      </TableHead>
      <TableHead class={cn(HEAD, 'min-w-[180px]')} aria-sort={ariaSortOf(data.sort, 'responsible')}>
        {@render sortable('responsible', 'Responsável')}
      </TableHead>
      <TableHead class={cn(HEAD, 'min-w-[120px]')} aria-sort={ariaSortOf(data.sort, 'health')}>
        {@render sortable('health', 'Saúde')}
      </TableHead>
      <TableHead class={cn(HEAD, 'min-w-[200px]')}>Manutenção</TableHead>
      <TableHead class={cn(HEAD, 'min-w-[110px]')} aria-sort={ariaSortOf(data.sort, 'tickets')}>
        {@render sortable('tickets', 'Chamados no mês')}
      </TableHead>
      <TableHead class={cn(HEAD, 'min-w-[110px]')}>Situação</TableHead>
      <TableHead class={cn(HEAD, 'min-w-[110px]')} aria-sort={ariaSortOf(data.sort, 'lastSeen')}>
        {@render sortable('lastSeen', 'Vista')}
      </TableHead>
      <TableHead class={cn(HEAD, 'w-14 text-right')}><span class="sr-only">Ações</span></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each data.computers as computer (computer.id)}
      {@const name = displayNameOf(computer)}
      {@const health = HEALTH_CLASSES[healthStatusTone(computer.healthStatus)]}
      {@const situation = situationOf(computer)}
      <!-- O clique é da LINHA, em qualquer célula; o véu do hover é o neutro da `AzuosTable`. -->
      <TableRow
        data-slot="computer-row"
        data-pending={computerPendingOf(computer) ? 'true' : undefined}
        class="cursor-pointer"
        onclick={() => actions.onOpen(computer)}
      >
        <TableCell class="max-w-[300px]">
          <span class="flex min-w-0 items-start gap-2">
            <!-- Sem pendência, o espaço do selo fica, para os nomes se alinharem. -->
            {#if computerPendingOf(computer)}
              <AlertBadge data={{ computer }} ui={{ className: 'mt-0.5' }} />
            {:else}
              <span aria-hidden="true" class="invisible size-5 shrink-0"></span>
            {/if}
            <span class="min-w-0">
              <!-- A linha já abre: o botão do nome não repete a navegação. -->
              <button
                type="button"
                onclick={(event) => {
                  event.stopPropagation();
                  actions.onOpen(computer);
                }}
                class="text-foreground block text-left leading-snug font-medium break-words focus-visible:underline focus-visible:outline-none"
              >
                {name}
              </button>
              <span class="text-muted-foreground mt-0.5 block font-mono text-xs break-words">
                {computer.hardware?.hostname || computer.name}
              </span>
            </span>
          </span>
        </TableCell>
        <TableCell class="max-w-[220px]">
          <!-- A foto do responsável vem do admin-console, como no cartão; sem ela, as iniciais. -->
          <span class="flex items-center gap-2">
            {#if computer.responsibleName}
              <PersonAvatar
                name={computer.responsibleName}
                avatarUrl={computer.responsibleAvatarUrl ?? null}
                ui={{ size: 'sm' }}
              />
            {/if}
            <span class="min-w-0">
              <span class="text-ink-700 block leading-snug break-words">
                {computerResponsibleLabel(computer)}
              </span>
              <span class="text-muted-foreground mt-0.5 block text-xs">
                {computerDepartmentLabel(computer)}
              </span>
            </span>
          </span>
        </TableCell>
        <TableCell>
          <span class={cn('flex items-center gap-1.5 text-xs font-semibold', health.text)}>
            <span aria-hidden="true" class={cn('size-1.5 rounded-full', health.dot)}></span>
            {healthStatusLabel(computer.healthStatus)}
          </span>
          <span class="text-muted-foreground block text-xs tabular-nums">
            {computer.healthScore}/100
          </span>
        </TableCell>
        <TableCell class="max-w-[240px]">
          <ComputerMaintenanceStatus
            data={{ computer, scheduledFor: data.scheduledFor?.[computer.id] ?? null }}
          />
        </TableCell>
        <!-- Zero fica cinza e discreto: a coluna existe para as que DÃO trabalho saltarem. -->
        <TableCell class="tabular-nums">
          <span
            class={computer.ticketsThisMonth > 0
              ? 'text-foreground font-bold'
              : 'text-muted-foreground'}
          >
            {computer.ticketsThisMonth}
          </span>
        </TableCell>
        <TableCell>
          <!-- A situação e, embaixo, o aviso de upgrade (calmo, com os motivos no balão). -->
          <span class="flex flex-col items-start gap-1">
            <StatusBadge data={{ label: situation.label }} ui={{ tone: situation.tone, size: 'sm' }} />
            <UpgradeBadge data={{ computer }} ui={{ className: 'relative z-10' }} />
          </span>
        </TableCell>
        <TableCell class="text-muted-foreground text-xs whitespace-nowrap">
          {formatTimeAgo(computer.lastSeenAt)}
        </TableCell>
        <!-- O menu não abre a ficha pela linha: o clique para aqui. -->
        <TableCell class="text-right" onclick={(event: MouseEvent) => event.stopPropagation()}>
          <ActionMenu
            data={{ label: `Ações de ${name}`, items: ROW_MENU }}
            ui={{ isIconOnly: true }}
            actions={{ onSelect: () => actions.onOpen(computer) }}
          />
        </TableCell>
      </TableRow>
    {/each}
  </TableBody>
  {#snippet footer()}
    <span>Parque de computadores sincronizado com o agente</span>
    <span>{data.computers.length} computador(es) listado(s)</span>
  {/snippet}
</Table>
