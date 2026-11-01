<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import SegmentedControl from './azuos-segmented-control.svelte';

  const options = [
    { value: 'open', label: 'Abertos' },
    { value: 'waiting', label: 'Aguardando' },
    { value: 'done', label: 'Resolvidos' },
  ];

  const { Story } = defineMeta({
    title: 'Components/AzuosSegmentedControl',
    component: SegmentedControl,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  args={{ data: { value: 'open', options }, ui: { ariaLabel: 'Recorte' }, actions: { onChange: () => {} } }}
/>

<Story
  name="Prominent"
  args={{
    data: { value: 'waiting', options },
    ui: { ariaLabel: 'Recorte', variant: 'prominent' },
    actions: { onChange: () => {} },
  }}
/>

<Story
  name="Disabled"
  args={{
    data: { value: 'open', options },
    ui: { ariaLabel: 'Recorte' },
    state: { isDisabled: true },
    actions: { onChange: () => {} },
  }}
/>

<!-- Caso limite: muitas opções num celular quebram linha dentro do trilho. -->
<Story name="ManyOnPhone">
  <div class="w-[320px]">
    <SegmentedControl
      data={{
        value: 'a',
        options: [
          { value: 'a', label: 'Faltam documentos' },
          { value: 'b', label: 'Prontas para concluir' },
          { value: 'c', label: 'Concluídas' },
        ],
      }}
      ui={{ ariaLabel: 'Recorte' }}
      actions={{ onChange: () => {} }}
    />
  </div>
</Story>
