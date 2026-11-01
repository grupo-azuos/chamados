<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import OtpField from './azuos-otp-field.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosOtpField',
    component: OtpField,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Empty" args={{ data: { label: 'Código recebido', value: '', length: 6 } }} />

<Story name="Partial" args={{ data: { label: 'Código recebido', value: '1234', length: 6 } }} />

<Story name="WithError" args={{ data: { label: 'Código recebido', value: '123456', length: 6 }, state: { error: 'Código incorreto' } }} />

<!-- Caso limite: oito dígitos num celular estreito — as caixas dividem a largura. -->
<Story name="EightDigitsOnPhone" asChild>
  <div class="w-[300px]">
    <OtpField data={{ label: 'Código recebido', value: '', length: 8 }} />
  </div>
</Story>
