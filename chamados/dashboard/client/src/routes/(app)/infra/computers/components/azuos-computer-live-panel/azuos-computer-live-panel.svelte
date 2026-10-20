<script lang="ts" module>
  import { type ComputerLive } from '@template/shared/schemas/computer-live.schema';

  export type AzuosComputerLivePanelProps = {
    data: {
      /** Nulo quando a máquina nunca enviou nada — o agente ainda não foi instalado nela. */
      live: ComputerLive | null;
    };
    state?: {
      isLoading?: boolean;
    };
  };
</script>

<script lang="ts">
  import EmptyState from '$lib/components/azuos-empty-state/azuos-empty-state.svelte';
  import UsageMeter from '$lib/components/azuos-usage-meter/azuos-usage-meter.svelte';
  import { formatBytes, formatPercent } from '$lib/utils/format-machine';
  import MonitorOff from '@lucide/svelte/icons/monitor-off';

  let { data, state: viewState }: AzuosComputerLivePanelProps = $props();

  const live = $derived(data.live);

  /** Bytes por segundo em palavras. A unidade é por segundo: é taxa, não tamanho. */
  const perSecond = (bytes: number) => `${formatBytes(bytes)}/s`;

  const memoryDetail = $derived(
    live ? `${formatBytes(live.memory.usedBytes)} de ${formatBytes(live.memory.totalBytes)}` : '',
  );

  /* A rede vem por interface, e quase sempre só uma está em uso. As paradas ficam de fora:
     listar seis adaptadores zerados esconderia a única que interessa. */
  const activeInterfaces = $derived(
    (live?.network ?? []).filter(
      (item) => item.bytesRecvPerSec > 0 || item.bytesSentPerSec > 0,
    ),
  );
</script>

{#if viewState?.isLoading}
  <p class="text-ink-500 text-sm">Lendo a máquina…</p>
{:else if !live}
  <EmptyState
    data={{
      title: 'Nada sendo medido ainda',
      description:
        'Esta máquina ainda não enviou nenhuma leitura. Instale o agente nela e cole a chave que aparece ao cadastrar o computador.',
    }}
    ui={{ icon: MonitorOff }}
  />
{:else}
  <div class="grid gap-3 lg:grid-cols-2 lg:items-start">
    <section aria-label="Uso do processador" class="bg-muted/30 rounded-box min-w-0 border p-4 lg:row-span-2">
      <h3 class="text-ink-500 mb-3 text-xs font-semibold tracking-wider uppercase">
        Processador — {formatPercent(live.cpu.percentTotal)} no total
      </h3>

      {#if live.cpu.percentPerCore.length === 0}
        <p class="text-ink-500 text-xs">Esta versão do agente não informa o uso por núcleo.</p>
      {:else}
        <div class="grid grid-cols-2 gap-x-4 gap-y-3">
          {#each live.cpu.percentPerCore as core, index (index)}
            <UsageMeter data={{ label: `Núcleo ${index + 1}`, percentage: core }} />
          {/each}
        </div>
      {/if}
    </section>

    <section aria-label="Uso da memória" class="bg-muted/30 rounded-box min-w-0 border p-4">
      <h3 class="text-ink-500 mb-3 text-xs font-semibold tracking-wider uppercase">Memória</h3>
      <UsageMeter
        data={{ label: 'Em uso', percentage: live.memory.usedPercent, detail: memoryDetail }}
      />

      {#if live.memory.swapTotalBytes > 0}
        <!-- A memória virtual só aparece quando existe: num Windows sem arquivo de paginação,
             uma linha zerada seria ruído permanente. -->
        <div class="mt-3">
          <UsageMeter
            data={{
              label: 'Memória virtual (swap)',
              percentage: live.memory.swapUsedPercent,
              detail: `${formatBytes(live.memory.swapUsedBytes)} de ${formatBytes(live.memory.swapTotalBytes)}`,
            }}
          />
        </div>
      {/if}
    </section>

    <section aria-label="Uso dos volumes" class="bg-muted/30 rounded-box min-w-0 border p-4">
      <h3 class="text-ink-500 mb-3 text-xs font-semibold tracking-wider uppercase">Volumes</h3>

      {#if live.disks.length === 0}
        <p class="text-ink-500 text-xs">Nenhum volume informado.</p>
      {:else}
        <div class="grid gap-3">
          {#each live.disks as disk (disk.mountpoint)}
            <UsageMeter
              data={{
                label: disk.mountpoint,
                percentage: disk.usedPercent,
                detail: `${formatBytes(disk.freeBytes)} livres de ${formatBytes(disk.totalBytes)}`,
              }}
            />
          {/each}
        </div>
      {/if}

      <p class="text-ink-500 mt-3 text-xs">
        Leitura {perSecond(live.diskIo.readBytesPerSec)} · Escrita
        {perSecond(live.diskIo.writeBytesPerSec)}
      </p>
    </section>

    <section aria-label="Tráfego de rede" class="bg-muted/30 rounded-box min-w-0 border p-4 lg:col-span-2">
      <h3 class="text-ink-500 mb-3 text-xs font-semibold tracking-wider uppercase">Rede</h3>

      {#if activeInterfaces.length === 0}
        <p class="text-ink-500 text-xs">Sem tráfego neste instante.</p>
      {:else}
        <dl class="grid gap-2">
          {#each activeInterfaces as item (item.name)}
            <div class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
              <dt class="text-ink-700 text-xs break-words">{item.name}</dt>
              <dd class="text-ink-900 shrink-0 text-xs tabular-nums">
                <span class="mr-3 inline-block">↓ {perSecond(item.bytesRecvPerSec)}</span>
                <span class="inline-block">↑ {perSecond(item.bytesSentPerSec)}</span>
              </dd>
            </div>
          {/each}
        </dl>
      {/if}
    </section>
  </div>
{/if}
