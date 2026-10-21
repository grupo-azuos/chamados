<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import {
    type Computer,
    type ComputerAlert,
    type ComputerSample,
  } from '@template/shared/schemas/computer.schema';

  import { type ComputerLive } from '@template/shared/schemas/computer-live.schema';

  import { type Maintenance } from '@template/shared/schemas/maintenance.schema';

  import ComputerDetailView from './azuos-computer-detail-view.svelte';

  const GB = 1024 ** 3;

  function computer(over: Partial<Computer> = {}): Computer {
    return {
      id: 3,
      name: 'CONTABIL-03',
      displayName: 'Contábil — mesa do fechamento',
      responsibleName: 'Daniela Prado',
      department: 'contabil',
      kind: 'desktop',
      hardware: {
        os: 'Microsoft Windows 11 Pro',
        platform: 'windows',
        platformVersion: '10.0.26100',
        kernelVersion: '10.0.26100',
        arch: 'amd64',
        cpuModel: 'AMD Ryzen 5 5600G',
        logicalCpus: 12,
        physicalCpus: 6,
        totalMemoryBytes: 8 * GB,
        macAddress: '00:00:5E:00:53:03',
        localIp: '198.51.100.13',
        totalDiskBytes: 500 * GB,
        freeDiskBytes: 14 * GB,
        uptimeSeconds: 47 * 24 * 60 * 60,
        bootTime: '2026-08-07T09:00:00.000Z',
      },
      healthScore: 63,
      healthStatus: 'critical',
      warnings: [
        { severity: 'critical', message: 'Disco quase cheio: só 2,8% livre' },
        {
          severity: 'attention',
          message: 'Ligada há 47 dias sem reiniciar — pode haver atualização pendente',
        },
      ],
      isOnline: true,
      lastSeenAt: new Date(Date.now() - 60 * 1000).toISOString(),
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

  /** Cadastrada e agente nunca instalado: tudo em branco, de propósito. */
  const pendingAgent = computer({
    id: 4,
    name: 'FISCAL-04',
    displayName: 'Fiscal — máquina nova, agente pendente',
    responsibleName: 'Eduardo Lima',
    department: 'fiscal',
    healthScore: 100,
    healthStatus: 'good',
    warnings: [],
    isOnline: false,
    lastSeenAt: null,
    agentVersion: null,
    hardware: {
      os: null,
      platform: null,
      platformVersion: null,
      kernelVersion: null,
      arch: null,
      cpuModel: null,
      logicalCpus: null,
      physicalCpus: null,
      totalMemoryBytes: null,
      macAddress: null,
      localIp: null,
      totalDiskBytes: null,
      freeDiskBytes: null,
      uptimeSeconds: null,
      bootTime: null,
    },
  });

  const START = Date.now() - 24 * 60 * 60 * 1000;
  const FIVE_MINUTES = 5 * 60 * 1000;

  const samples: ComputerSample[] = Array.from({ length: 288 }, (_, index) => {
    const wave = Math.sin(index / 18) * 12;
    const isSpike = index >= 250 && index < 258;

    return {
      sampledAt: new Date(START + index * FIVE_MINUTES).toISOString(),
      cpuPercent: isSpike ? 99 : 35 + wave,
      memoryPercent: isSpike ? 99 : 71 + wave / 2,
      diskPercent: 97,
      networkBytesPerSec: 120000,
    };
  });

  const alerts: ComputerAlert[] = [
    {
      id: 1,
      computerId: 3,
      metric: 'disk',
      peakValue: 97.2,
      threshold: 90,
      status: 'active',
      startedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      recoveredAt: null,
      causeProcess: 'OneDrive.exe',
    },
    {
      id: 2,
      computerId: 3,
      metric: 'cpu',
      peakValue: 99.4,
      threshold: 98,
      status: 'recovered',
      startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      recoveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      causeProcess: 'excel.exe',
    },
  ];

  const maintenances: Maintenance[] = [
    {
      id: 1,
      computerId: 3,
      computerName: 'CONTABIL-03',
      computerDisplayName: 'Contábil — mesa do fechamento',
      computerDepartment: 'contabil',
      otherMachine: null,
      type: 'corrective',
      description: 'Máquina desligando sozinha: cooler do processador substituído.',
      performedBy: 'Carlos (assistência externa)',
      performedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'suporte@azuos.local',
      updatedAt: null,
      updatedBy: null,
    },
  ];

  const transfers = [
    {
      id: 1,
      computerId: 2,
      fromDepartment: 'recepcao' as const,
      toDepartment: 'financeiro' as const,
      responsible: 'Coordenação financeira',
      note: 'Passou para o financeiro quando a recepção recebeu a máquina nova.',
      peripheralsLeftBehind: 1,
      createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'suporte@azuos.local',
    },
  ];

  const actions = {
    onEdit: () => {},
    onRegisterMaintenance: () => {},
    onScheduleMaintenance: () => {},
    onCancelSchedule: () => {},
    onTransfer: () => {},
    onArchivedChange: () => {},
    onBlockedChange: () => {},
    onRegenerateToken: () => {},
    onDownloadInstaller: () => {},
    onDispose: () => {},
    onRestore: () => {},
    onBack: () => {},
    onAlertPageChange: () => {},
    onTicketPageChange: () => {},
  };

  const live: ComputerLive = {
    computerId: 3,
    measuredAt: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    isOnline: true,
    cpu: { percentTotal: 6, percentPerCore: [8, 5, 12, 2, 15, 2, 9, 3, 6, 0, 12, 3] },
    memory: { totalBytes: 16 * GB, usedBytes: 13 * GB, freeBytes: 3 * GB, usedPercent: 81.25,
      swapTotalBytes: 8 * GB, swapUsedBytes: GB, swapUsedPercent: 12.5 },
    disks: [{ mountpoint: 'C:', fstype: 'NTFS', totalBytes: 240 * GB, usedBytes: 64 * GB,
      freeBytes: 176 * GB, usedPercent: 26.67 }],
    diskIo: { readBytesPerSec: 0, writeBytesPerSec: 0 },
    network: [{ name: 'Ethernet', bytesRecvPerSec: 5 * 1024, bytesSentPerSec: 18 * 1024 }],
    processes: [],
  };

  const liveData = {
    computer: computer({ displayName: 'Estação do atendimento', healthScore: 100, healthStatus: 'good', warnings: [] }),
    samples, live, alerts: [], alertPaging: { page: 1, pageSize: 25, total: 0 },
    ticketPaging: { page: 1, pageSize: 25, total: 0 }, tickets: [], maintenances: [], partMovements: [], transfers: [],
  };

  /** Uma página de 25, com o total que o servidor devolveria. */
  const paging = { page: 1, pageSize: 25, total: alerts.length };
  const noPaging = { page: 1, pageSize: 25, total: 0 };

  const { Story } = defineMeta({
    title: 'Features/Computers/AzuosComputerDetailView',
    component: ComputerDetailView,
  });
</script>

<!-- A máquina com problema: é para ela que esta tela existe. -->
<Story name="Default" args={{ data: { computer: computer(), samples, live: null,
        tickets: [], alerts, alertPaging: paging, ticketPaging: noPaging, maintenances, partMovements: [], transfers }, actions }} />

<!-- Com manutenção agendada: o cartão do alto troca o prazo automático pelo dia combinado. -->
<Story name="WithSchedule" args={{ data: { computer: computer(), samples, live: null,
        tickets: [], alerts, alertPaging: paging, ticketPaging: noPaging, maintenances, partMovements: [], transfers,
        schedule: { computerId: 3, computerName: 'CONTABIL-03', computerDisplayName: 'Contábil — mesa do fechamento',
          computerDepartment: 'contabil', scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          note: 'Trocar pasta térmica', createdAt: new Date().toISOString(), createdBy: 'suporte@azuos.local',
          updatedAt: null, updatedBy: null } }, actions }} />

<!-- A MESMA tela em 400px: a tabela sai de cena e entra o cartão empilhado (skill `ui-standards`). -->
<Story name="Celular" globals={{ viewport: { value: 'celular' } }} args={{ data: { computer: computer(), samples, live: null,
        tickets: [], alerts, alertPaging: paging, ticketPaging: noPaging, maintenances, partMovements: [], transfers }, actions }} />

<!-- Máquina saudável: nada apontado, e o texto diz isso em vez de ficar em branco. -->
<Story
  name="Healthy"
  args={{
    data: {
      computer: computer({
        id: 1,
        name: 'RECEPCAO-01',
        displayName: 'Recepção — balcão',
        responsibleName: 'Bia Costa',
        department: 'recepcao',
        healthScore: 100,
        healthStatus: 'good',
        warnings: [],
      }),
      samples,
      live: null,
        tickets: [],
        alerts: [], alertPaging: noPaging, ticketPaging: noPaging,
      maintenances: [],
      partMovements: [],
      transfers: [],
    },
    actions,
  }}
/>

<Story
  name="Loading"
  args={{
    data: { computer: computer(), samples: [], live: null,
        tickets: [],
        alerts: [], alertPaging: noPaging, ticketPaging: noPaging, maintenances: [], partMovements: [], transfers },
    state: { isSamplesLoading: true, isAlertsLoading: true },
    actions,
  }}
/>

<!-- CASO LIMITE: cadastrada e nunca vista. A ficha diz "ainda não sei", e não zeros. -->
<Story
  name="Agent never connected"
  args={{ data: { computer: pendingAgent, samples: [], live: null,
        tickets: [],
        alerts: [], alertPaging: noPaging, ticketPaging: noPaging, maintenances: [], partMovements: [], transfers }, actions }}
/>

<Story
  name="Blocked"
  args={{
    data: {
      computer: computer({
        isBlocked: true,
        isOnline: false,
        blockReason: 'Máquina emprestada devolvida ao fornecedor; parou de ser monitorada.',
      }),
      samples,
      live: null,
        tickets: [],
      alerts, alertPaging: paging, ticketPaging: noPaging,
      maintenances,
      partMovements: [],
      transfers: [],
    },
    actions,
  }}
/>

<Story
  name="Archived"
  args={{
    data: { computer: computer({ isArchived: true, isOnline: false }), samples, live: null,
        tickets: [], alerts, alertPaging: paging, ticketPaging: noPaging, maintenances, partMovements: [], transfers },
    actions,
  }}
/>

<!-- Falha de gravação: fica na tela, em vermelho, com o motivo (CONTRIBUTING §15). -->
<Story
  name="Action error"
  args={{
    data: { computer: computer(), samples, live: null,
        tickets: [], alerts, alertPaging: paging, ticketPaging: noPaging, maintenances, partMovements: [], transfers },
    state: { actionError: 'Você não tem permissão para alterar o cadastro.' },
    actions,
  }}
/>

<!-- O instalador não saiu (nenhuma versão publicada, bucket fora): o motivo fica na tela. -->
<Story
  name="Installer error"
  args={{
    data: { computer: computer(), samples, live: null,
        tickets: [], alerts, alertPaging: paging, ticketPaging: noPaging, maintenances, partMovements: [], transfers },
    state: { installerError: 'Nenhuma versão do agente foi publicada ainda.' },
    actions,
  }}
/>


<Story name="Live readings" args={{ data: liveData, actions }} />

<Story name="Long identity on mobile" asChild>
  <div class="mx-auto w-full max-w-sm">
    <ComputerDetailView
      data={{ ...liveData, computer: { ...liveData.computer,
        displayName: 'Estação de atendimento e conferência de documentos da recepção',
        name: 'DESKTOP-ATENDIMENTO-RECEPCAO-SEGUNDO-ANDAR',
        responsibleName: 'Equipe de atendimento e conferência de documentos' },
        live: { ...live, network: [{ name: 'Adaptador Ethernet da recepção no segundo andar', bytesRecvPerSec: 512000, bytesSentPerSec: 18432000 }] } }}
      {actions}
    />
  </div>
</Story>

<Story name="Saving" args={{ data: liveData, actions, state: { isSaving: true } }} />

<Story name="Disposed" args={{ data: { ...liveData, computer: { ...liveData.computer,
  isOnline: false, disposedAt: '2026-10-01T12:00:00.000Z', disposalType: 'scrap', disposalReason: 'Equipamento substituído após avaliação técnica.' } }, actions }} />
