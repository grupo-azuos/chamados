<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import TicketComputersDialog from './azuos-ticket-computers-dialog.svelte';

  const computers = Array.from({ length: 9 }, (_, index) => ({
    id: index + 1,
    label: `COMPUTADOR - 0${index + 1}`,
    hostname: `COMERCIAL-D0${index + 1}`,
    responsibleName: index % 3 === 0 ? null : 'Pessoa Exemplo',
    department: index % 2 === 0 ? 'Comercial' : 'Fiscal',
    isOnline: index % 4 !== 0,
  }));
  const departments = [
    { value: 'Comercial', label: 'Comercial' },
    { value: 'Fiscal', label: 'Fiscal' },
  ];
  const actions = {
    onSearch: () => {},
    onDepartmentChange: () => {},
    onToggle: () => {},
    onClearSelection: () => {},
    onApply: () => {},
    onClose: () => {},
  };
  const data = { computers, selectedIds: [6, 7], search: '', department: '', departments };

  const { Story } = defineMeta({
    title: 'Components/AzuosTicketComputersDialog',
    component: TicketComputersDialog,
  });
</script>

<Story name="Default" args={{ data, actions }} />

<Story name="Nothing selected" args={{ data: { ...data, selectedIds: [] }, actions }} />

<Story name="Loading" args={{ data: { ...data, computers: [] }, state: { isLoading: true }, actions }} />

<Story name="No result" args={{ data: { ...data, computers: [], search: 'xyz' }, actions }} />

<Story name="Saving" args={{ data, state: { isSaving: true }, actions }} />

<Story
  name="Refused"
  args={{ data, state: { error: 'Alguma máquina escolhida não existe mais no inventário.' }, actions }}
/>

<!-- Caso limite: nome comprido não estica o card. -->
<Story
  name="Long name"
  args={{
    data: {
      ...data,
      computers: [
        {
          id: 1,
          label: 'Sala de atendimento compartilhada — computador da equipe de suporte',
          hostname: 'ATENDIMENTO-ESTACAO-04',
          responsibleName: 'Pessoa Exemplo',
          department: 'Comercial',
          isOnline: true,
        },
      ],
    },
    actions,
  }}
/>
