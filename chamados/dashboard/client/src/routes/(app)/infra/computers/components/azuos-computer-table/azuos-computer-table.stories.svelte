<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type ComputerListItem } from '@template/shared/schemas/computer.schema';
  import { fn } from 'storybook/test';

  import ComputerTable from './azuos-computer-table.svelte';

  const GB = 1024 ** 3;

  function computer(over: Partial<ComputerListItem> = {}): ComputerListItem {
    return {
      id: 1,
      ticketsThisMonth: 0,
      preventiveStatus: 'ok',
      lastPreventiveAt: '2026-10-01T12:00:00.000Z',
      activeAlerts: 0,
      activeAlertMetrics: [],
      name: 'RECEPCAO-01',
      displayName: 'Recepção — balcão',
      responsibleName: 'Bia Costa',
      department: 'recepcao',
      kind: 'desktop',
      hardware: {
        os: 'Microsoft Windows 11 Pro',
        platform: 'windows',
        platformVersion: '10.0.26100',
        kernelVersion: '10.0.26100',
        arch: 'amd64',
        cpuModel: 'Intel Core i5-12400',
        logicalCpus: 12,
        physicalCpus: 6,
        totalMemoryBytes: 16 * GB,
        macAddress: '00:00:5E:00:53:01',
        localIp: '198.51.100.11',
        totalDiskBytes: 480 * GB,
        freeDiskBytes: 210 * GB,
        uptimeSeconds: 3 * 24 * 60 * 60,
        bootTime: '2026-09-20T09:00:00.000Z',
      },
      healthScore: 100,
      healthStatus: 'good',
      warnings: [],
      isOnline: true,
      lastSeenAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      agentVersion: '1.0.0',
      isArchived: false,
      isBlocked: false,
      blockReason: null,
      disposedAt: null,
      disposalType: null,
      disposalReason: null,
      createdAt: '2026-05-01T12:00:00.000Z',
      createdBy: 'suporte@azuos.local',
      updatedAt: null,
      updatedBy: null,
      ...over,
    };
  }

  const computers = [
    computer(),
    computer({ id: 2, name: 'FISCAL-D02', displayName: null, activeAlerts: 1, healthStatus: 'critical', healthScore: 51, ticketsThisMonth: 4 }),
    computer({ id: 3, name: 'CAIXA-N01', displayName: 'Caixa — notebook', kind: 'notebook', preventiveStatus: 'due', lastPreventiveAt: '2026-01-10T12:00:00.000Z', isOnline: false }),
    computer({ id: 4, name: 'CS-D06', displayName: null, isBlocked: true, isOnline: false, responsibleName: null, department: null }),
  ];
  const actions = { onOpen: fn(), onSortChange: fn() };
  const { Story } = defineMeta({
    title: 'Features/Computers/AzuosComputerTable',
    component: ComputerTable,
    tags: ['autodocs'],
  });
</script>

<!-- As pendentes (alerta, preventiva vencida) com o selo que pisca antes do nome. -->
<Story name="Default" args={{ data: { computers, sort: { field: 'number', direction: 'asc' } }, actions }} />
<Story name="Por saúde, decrescente" args={{ data: { computers, sort: { field: 'health', direction: 'desc' } }, actions }} />
<!-- Sem onSortChange: os cabeçalhos são só texto. -->
<Story name="Sem ordenação" args={{ data: { computers }, actions: { onOpen: fn() } }} />
<Story name="Vazia" args={{ data: { computers: [] }, actions }} />
