<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import CheckboxField from './azuos-checkbox-field.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosCheckboxField',
    component: CheckboxField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { label: 'Avisar por WhatsApp', name: 'notify', isChecked: false } }} />

<Story
  name="CheckedWithDescription"
  args={{ data: { label: 'Avisar por WhatsApp', name: 'notify', isChecked: true, description: 'Uma mensagem a cada andamento do chamado' } }}
/>

<Story name="Disabled" args={{ data: { label: 'Avisar por e-mail', name: 'email', isChecked: false }, state: { isDisabled: true } }} />

<!-- Caso limite: rótulo comprido num celular quebra linha ao lado da caixa. -->
<Story name="LongLabelOnPhone">
  <div class="w-[300px]">
    <CheckboxField data={{ label: 'Avisar todas as pessoas que acompanham o chamado quando ele mudar de situação', name: 'all', isChecked: true }} />
  </div>
</Story>
