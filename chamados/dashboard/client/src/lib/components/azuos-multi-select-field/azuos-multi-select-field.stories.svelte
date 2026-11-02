<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import MultiSelectField from './azuos-multi-select-field.svelte';

  const options = [
    { value: 'infra', label: 'Infraestrutura' },
    { value: 'sistema', label: 'Sistemas' },
    { value: 'manutencao', label: 'Manutenção' },
  ];
  const base = { options, placeholder: 'Todas as áreas', noun: 'áreas' };

  /* Pessoas inventadas: uma com foto, as outras com as iniciais. */
  const people = [
    { value: 'ana', label: 'Ana Souza', personName: 'Ana Souza', avatarUrl: 'https://i.pravatar.cc/64?img=5' },
    { value: 'caio', label: 'Caio Ribeiro', personName: 'Caio Ribeiro', avatarUrl: null },
    { value: 'dani', label: 'Dani Albuquerque', personName: 'Dani Albuquerque' },
  ];

  const { Story } = defineMeta({
    title: 'Components/AzuosMultiSelectField',
    component: MultiSelectField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Empty" args={{ data: { ...base, values: [] }, ui: { ariaLabel: 'Área' }, actions: { onChange: () => {} } }} />

<Story name="Two" args={{ data: { ...base, values: ['infra', 'sistema'] }, ui: { ariaLabel: 'Área' }, actions: { onChange: () => {} } }} />

<Story name="Count" args={{ data: { ...base, values: ['infra', 'sistema', 'manutencao'] }, ui: { ariaLabel: 'Área' }, actions: { onChange: () => {} } }} />

<Story name="Disabled" args={{ data: { ...base, values: ['infra'] }, ui: { ariaLabel: 'Área' }, state: { isDisabled: true }, actions: { onChange: () => {} } }} />

<!-- Seletor de pessoas: os rostos de quem está marcado no botão, e a foto em cada linha. -->
<Story name="WithPeople" args={{ data: { values: ['ana', 'caio'], options: people, placeholder: 'Todos os responsáveis', noun: 'pessoas' }, ui: { ariaLabel: 'Responsáveis' }, actions: { onChange: () => {} } }} />
