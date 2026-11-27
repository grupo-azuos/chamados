<!--
  @component
  OS APLICATIVOS QUE MAIS GASTAM na leitura ao vivo da máquina: nome, processador e memória.

  Mostra só os primeiros (10 por padrão); o resto vira a linha "e mais N aplicativos com consumo
  menor". Quando um aplicativo abre vários processos (o Chrome, um por aba), diz quantos são, para
  o número de memória não parecer absurdo para um "programa só". Tem o estado de lendo e o de
  leitura sem aplicativos.

  - `data.processes`: a lista que o agente mandou, já na ordem de consumo.
  - `ui.limit`: quantos mostrar.
  - `state.isLoading`: a leitura ainda não chegou.
-->
<script lang="ts" module>
  import { type ComputerLive } from '@template/shared/schemas/computer-live.schema';

  export type AzuosComputerProcessTableProps = {
    data: {
      processes: ComputerLive['processes'];
    };
    ui?: {
      /** Quantos aplicativos mostrar. O resto vira uma linha de "e mais N". */
      limit?: number;
    };
    state?: {
      isLoading?: boolean;
    };
  };

  const DEFAULT_LIMIT = 10;
</script>

<script lang="ts">
  import { Skeleton } from '$lib/components/azuos-skeleton/azuos-skeleton';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '$lib/components/azuos-table/azuos-table';
  import { formatBytes, formatPercent } from '$lib/utils/format-machine';

  let { data, ui, state: viewState }: AzuosComputerProcessTableProps = $props();

  const limit = $derived(ui?.limit ?? DEFAULT_LIMIT);
  const shown = $derived(data.processes.slice(0, limit));
  const hidden = $derived(Math.max(0, data.processes.length - limit));

  /* Cabeçalho em frase, e não em caixa alta espaçada (padrão Apple, `apple/sentence-case-labels`). */
  const HEAD = 'normal-case tracking-normal px-0';
</script>

{#if viewState?.isLoading}
  <!-- O esqueleto tem a forma das linhas da tabela, e diz o que está esperando. -->
  <div role="status" aria-label="Lendo a máquina…" aria-busy="true" class="flex flex-col gap-3 py-1">
    {#each [0, 1, 2, 3] as row (row)}
      <div class="flex items-center justify-between gap-4">
        <Skeleton class="h-4 w-1/2" />
        <Skeleton class="h-4 w-24" />
      </div>
    {/each}
  </div>
{:else if data.processes.length === 0}
  <p class="text-ink-500 text-sm">Nenhum aplicativo informado nesta leitura.</p>
{:else}
  <!-- A tabela da casa, sem a superfície: ela já mora dentro do bloco (card dentro de card não). -->
  <Table containerClass="rounded-none bg-transparent shadow-none">
    <TableHeader>
      <TableRow>
        <TableHead class={HEAD}>Aplicativo</TableHead>
        <TableHead class={`${HEAD} text-right`}>Processador</TableHead>
        <TableHead class={`${HEAD} text-right`}>Memória</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each shown as process (process.name)}
        <TableRow>
          <TableCell class="text-ink-900 max-w-0 truncate px-0 pr-3">
            {process.name}
            {#if process.instanceCount > 1}
              <!-- O Chrome abre um processo por aba: dizer quantos são explica um número de
                   memória que, de outro modo, pareceria absurdo para um "programa só". -->
              <span class="text-ink-500 text-xs">({process.instanceCount} processos)</span>
            {/if}
          </TableCell>
          <TableCell class="text-ink-900 px-0 text-right tabular-nums">
            {formatPercent(process.cpuPercent)}
          </TableCell>
          <TableCell class="text-ink-900 px-0 text-right tabular-nums">
            {formatBytes(process.memBytes)}
          </TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>

  {#if hidden > 0}
    <p class="text-ink-500 mt-2 text-xs">
      e mais {hidden} aplicativo{hidden === 1 ? '' : 's'} com consumo menor.
    </p>
  {/if}
{/if}
