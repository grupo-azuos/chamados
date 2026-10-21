<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import ComputerMaintenanceStatus from './azuos-computer-maintenance-status.svelte';

  const base = { preventiveStatus: 'ok' as const, lastPreventiveAt: '2026-10-01T12:00:00.000Z',
    activeAlerts: 0, isArchived: false, disposedAt: null };
  const { Story } = defineMeta({ title: 'Features/Computers/AzuosComputerMaintenanceStatus', component: ComputerMaintenanceStatus });
</script>

<Story name="UpToDate" args={{ data: { computer: base } }} />
<!-- Último dia antes de vencer: o contador diz "falta 1 dia" ou "vence hoje", conforme a hora. -->
<Story name="AboutToExpire" args={{ data: { computer: { ...base,
  lastPreventiveAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString() } } }} />
<Story name="PreventiveDue" args={{ data: { computer: { ...base, preventiveStatus: 'due', lastPreventiveAt: '2026-04-01T12:00:00.000Z' } } }} />
<Story name="NoMaintenanceRecorded" args={{ data: { computer: { ...base, preventiveStatus: 'never', lastPreventiveAt: null } } }} />
<Story name="ActiveCriticalAlert" args={{ data: { computer: { ...base, activeAlerts: 1 } } }} />
<Story name="BothNeeds" args={{ data: { computer: { ...base, activeAlerts: 3, preventiveStatus: 'due' } } }} />
<Story name="Archived" args={{ data: { computer: { ...base, preventiveStatus: null, activeAlerts: 2, isArchived: true } } }} />
<Story name="NotInformed" args={{ data: { computer: { ...base, preventiveStatus: null } } }} />
