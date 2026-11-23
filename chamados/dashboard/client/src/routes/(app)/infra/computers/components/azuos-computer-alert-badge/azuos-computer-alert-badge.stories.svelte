<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import AlertBadge from './azuos-computer-alert-badge.svelte';

  const calm = { activeAlerts: 0, preventiveStatus: 'ok' as const, isArchived: false, disposedAt: null };
  const { Story } = defineMeta({
    title: 'Features/Computers/AzuosComputerAlertBadge',
    component: AlertBadge,
    tags: ['autodocs'],
  });
</script>

<Story name="Alerta ativo" args={{ data: { computer: { ...calm, activeAlerts: 2 } } }} />
<Story name="Preventiva vencida" args={{ data: { computer: { ...calm, preventiveStatus: 'due' } } }} />
<Story
  name="Alerta e preventiva"
  args={{ data: { computer: { ...calm, activeAlerts: 1, preventiveStatus: 'due' } } }}
/>
<!-- Caso limite: mais de 99 cabe como "99+"; o número inteiro está no balão. -->
<Story name="Muitos alertas" args={{ data: { computer: { ...calm, activeAlerts: 140 } } }} />
<!-- Sem pendência, ou fora de uso: não desenha nada. -->
<Story name="Sem pendência" args={{ data: { computer: calm } }} />
<Story name="Arquivada" args={{ data: { computer: { ...calm, activeAlerts: 3, isArchived: true } } }} />
