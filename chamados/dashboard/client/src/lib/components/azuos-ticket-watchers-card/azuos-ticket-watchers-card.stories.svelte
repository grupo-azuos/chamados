<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import TicketWatchersCard from './azuos-ticket-watchers-card.svelte';

  const options = [
    { id: 'u-bia', name: 'Bia Costa' },
    { id: 'u-caio', name: 'Caio Reis' },
    { id: 'u-dani', name: 'Daniela Albuquerque Vasconcelos de Souza' },
  ];
  const actions = { onChange: () => {} };

  const { Story } = defineMeta({
    title: 'Components/AzuosTicketWatchersCard',
    component: TicketWatchersCard,
  });
</script>

<!-- Ninguém vinculado. -->
<Story name="Default" args={{ data: { selectedIds: [], options }, actions }} />

<Story name="WithPeople" args={{ data: { selectedIds: ['u-bia', 'u-dani'], options }, actions }} />

<Story name="Loading" args={{ data: { selectedIds: [], options: [] }, state: { isLoading: true }, actions }} />

<Story name="Saving" args={{ data: { selectedIds: ['u-caio'], options }, state: { isSaving: true }, actions }} />

<!-- Quem só consulta tenta mexer: a recusa do servidor aparece embaixo. -->
<Story
  name="WithError"
  args={{
    data: { selectedIds: [], options },
    state: { error: 'Seu acesso a estas áreas é só de consulta — não atende chamados.' },
    actions,
  }}
/>
