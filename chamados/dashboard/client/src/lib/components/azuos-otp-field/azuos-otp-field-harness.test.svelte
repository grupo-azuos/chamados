<script lang="ts">
  /** Guarda o código como a tela guardaria, para as caixas receberem de volta o que mandaram. */
  import OtpField from './azuos-otp-field.svelte';

  let {
    onComplete,
    initial = '',
    error = null,
    isDisabled = false,
    isAutoFocused = false,
  }: {
    onComplete: (value: string) => void;
    initial?: string;
    error?: string | null;
    isDisabled?: boolean;
    isAutoFocused?: boolean;
  } = $props();

  // svelte-ignore state_referenced_locally
  let value = $state(initial);
</script>

<OtpField
  data={{ label: 'Código recebido', value, length: 6 }}
  state={{ error, isDisabled, isAutoFocused }}
  actions={{ onChange: (next) => (value = next), onComplete }}
/>
<output data-testid="valor">{value}</output>
