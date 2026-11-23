<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import UpgradeBadge from './azuos-computer-upgrade-badge.svelte';

  const GB = 1024 ** 3;

  /* Dados inventados: uma máquina em dia, que cada história deixa aquém num ponto. */
  const hardware = {
    os: null,
    platform: null,
    platformVersion: null,
    kernelVersion: null,
    arch: null,
    cpuModel: '12th Gen Intel(R) Core(TM) i5-12400',
    logicalCpus: null,
    physicalCpus: null,
    totalMemoryBytes: 16 * GB,
    macAddress: null,
    localIp: null,
    totalDiskBytes: 500 * GB,
    freeDiskBytes: 250 * GB,
    uptimeSeconds: null,
    bootTime: null,
  };
  const inUse = { isArchived: false, disposedAt: null };

  const { Story } = defineMeta({
    title: 'Features/Computers/AzuosComputerUpgradeBadge',
    component: UpgradeBadge,
    tags: ['autodocs'],
  });
</script>

<Story
  name="Pouca memória"
  args={{ data: { computer: { ...inUse, hardware: { ...hardware, totalMemoryBytes: 4 * GB } } } }}
/>
<Story
  name="Processador antigo"
  args={{
    data: { computer: { ...inUse, hardware: { ...hardware, cpuModel: 'Intel(R) Core(TM) i5-4590 CPU @ 3.30GHz' } } },
  }}
/>
<!-- Caso limite: os três motivos juntos — o balão lista todos, na ordem da régua. -->
<Story
  name="Todos os motivos"
  args={{
    data: {
      computer: {
        ...inUse,
        hardware: {
          ...hardware,
          totalMemoryBytes: 4 * GB,
          totalDiskBytes: 120 * GB,
          freeDiskBytes: 6 * GB,
          cpuModel: 'AMD A8-7600 Radeon R7, 10 Compute Cores 4C+6G',
        },
      },
    },
  }}
/>
<!-- Em dia, ou fora de uso: não desenha nada. -->
<Story name="Em dia" args={{ data: { computer: { ...inUse, hardware } } }} />
<Story
  name="Arquivada"
  args={{ data: { computer: { isArchived: true, disposedAt: null, hardware: { ...hardware, totalMemoryBytes: 4 * GB } } } }}
/>
