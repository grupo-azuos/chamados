<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import { fn } from 'storybook/test';

  import SelectField from './azuos-select-field.svelte';

  const owners = [
    { value: '', label: 'Todos os responsáveis' },
    { value: 'Ana', label: 'Ana' },
    { value: 'Bia', label: 'Bia' },
  ];

  /* Pessoas inventadas: uma com foto, as outras com as iniciais. */
  const people = [
    { value: 'ana', label: 'Ana Souza', personName: 'Ana Souza', avatarUrl: 'https://i.pravatar.cc/64?img=5' },
    { value: 'caio', label: 'Caio Ribeiro', personName: 'Caio Ribeiro', avatarUrl: null },
    { value: 'dani', label: 'Dani Albuquerque', personName: 'Dani Albuquerque' },
  ];

  const baseArgs = {
    data: { value: '', options: owners },
    ui: { ariaLabel: 'Responsável', placeholder: 'Todos os responsáveis' },
    actions: { onChange: fn() },
  };

  const { Story } = defineMeta({
    title: 'Components/AzuosSelectField',
    component: SelectField,
  });
</script>

<!-- Campo de seleção ocupa a largura que recebe; a caixa estreita mostra como ele fica
     numa barra de filtros de verdade. -->
{#snippet inBox(args: ComponentProps<typeof SelectField>)}
  <div class="w-56">
    <SelectField {...args} />
  </div>
{/snippet}

<Story name="Default" args={baseArgs} template={inBox} />

<Story
  name="WithValueSelected"
  args={{ ...baseArgs, data: { value: 'Ana', options: owners } }}
  template={inBox}
/>

<Story name="Disabled" args={{ ...baseArgs, state: { isDisabled: true } }} template={inBox} />

<!-- Caso limite: lista de opções longa o bastante para rolar dentro do menu. -->
<Story
  name="ManyOptions"
  args={{
    ...baseArgs,
    data: {
      value: '',
      options: [
        { value: '', label: 'Todos' },
        ...Array.from({ length: 20 }, (_, index) => ({
          value: `opcao-${index}`,
          label: `Opção ${index + 1}`,
        })),
      ],
    },
  }}
  template={inBox}
/>

<!-- Seletor de pessoa: a foto (ou as iniciais) vem antes do nome, no gatilho e em cada linha. -->
<Story name="WithPeople" args={{ ...baseArgs, data: { value: 'caio', options: people } }} template={inBox} />
