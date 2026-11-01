<script lang="ts">
  /** Guarda o código como a tela guardaria, para as caixas receberem de volta o que mandaram. */
  import OtpField from './azuos-otp-field.svelte';

  let { onComplete }: { onComplete: (value: string) => void } = $props();

  let value = $state('');
</script>

<OtpField
  data={{ label: 'Código recebido', value, length: 6 }}
  actions={{ onChange: (next) => (value = next), onComplete }}
/>
<output data-testid="valor">{value}</output>
