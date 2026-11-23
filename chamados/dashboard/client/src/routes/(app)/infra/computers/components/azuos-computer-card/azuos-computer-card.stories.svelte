<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type ComputerListItem } from '@template/shared/schemas/computer.schema';
  import { fn } from 'storybook/test';

  import ComputerCard from './azuos-computer-card.svelte';

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
      responsibleId: 'person-bia-costa',
      responsibleName: 'Bia Costa',
      responsibleAvatarUrl: null,
      departmentId: null, departmentName: null,
      notes: null,
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

  const actions = { onOpen: fn() };
  const { Story } = defineMeta({
    title: 'Features/Computers/AzuosComputerCard',
    component: ComputerCard,
    tags: ['autodocs'],
  });
</script>

<!-- Máquina em dia: sem selo, faixa verde, hover só neutro. -->
<Story name="Default" args={{ data: { computer: computer() }, actions }} />
<!-- Precisa de upgrade: o selo âmbar, calmo, com os motivos no balão. -->
<Story
  name="PrecisaDeUpgrade"
  args={{
    data: {
      computer: computer({
        hardware: {
          ...computer().hardware,
          totalMemoryBytes: 4 * 1024 ** 3,
          cpuModel: 'Intel(R) Core(TM) i5-4590 CPU @ 3.30GHz',
        },
      }),
    },
    actions,
  }}
/>
<!-- Com a foto do responsável, vinda do admin-console; sem ela, ficam as iniciais (Default). -->
<Story
  name="ComFotoDoResponsavel"
  args={{ data: { computer: computer({ responsibleAvatarUrl: 'https://i.pravatar.cc/64?img=47' }) }, actions }}
/>
<!-- Alerta crítico aberto: o selo vermelho pisca no canto da faixa. -->
<Story
  name="Com alerta"
  args={{ data: { computer: computer({ activeAlerts: 2, activeAlertMetrics: ['cpu', 'memory'], healthStatus: 'critical', healthScore: 58 }) }, actions }}
/>
<!-- Preventiva vencida: também pisca, e a manutenção diz desde quando. -->
<Story
  name="Preventiva vencida"
  args={{ data: { computer: computer({ preventiveStatus: 'due', lastPreventiveAt: '2026-01-10T12:00:00.000Z' }) }, actions }}
/>
<Story
  name="Agendada"
  args={{ data: { computer: computer({ preventiveStatus: 'never', lastPreventiveAt: null }), scheduledFor: '2026-12-02' }, actions }}
/>
<Story
  name="Offline sem responsável"
  args={{ data: { computer: computer({ isOnline: false, lastSeenAt: null, responsibleName: null, responsibleId: null, departmentId: null, departmentName: null }) }, actions }}
/>
<Story name="Bloqueada" args={{ data: { computer: computer({ isOnline: false, isBlocked: true }) }, actions }} />
<Story name="Arquivada" args={{ data: { computer: computer({ isArchived: true, activeAlerts: 1 }) }, actions }} />
<!-- CASO LIMITE: nome comprido em tudo — o título corta em duas linhas, o resto em uma. -->
<Story
  name="Nomes compridos"
  args={{
    data: {
      computer: computer({
        name: 'PARALEGAL-08-ESTACAO-COMPARTILHADA',
        displayName: 'Paralegal — estação compartilhada do corredor (usada por mais de uma pessoa)',
        responsibleId: 'person-isabela-marques-de-o',
        responsibleName: 'Isabela Marques de Oliveira e Souza Rodrigues',
        responsibleAvatarUrl: null,
        departmentId: 6, departmentName: 'Paralegal',
        notes: null,
        activeAlerts: 140,
      }),
    },
    actions,
  }}
/>
