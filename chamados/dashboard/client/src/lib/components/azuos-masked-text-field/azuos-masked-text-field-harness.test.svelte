<script lang="ts">
  /** Guarda o valor como a tela guardaria, para o campo receber de volta o que mandou. */
  import type { FieldMask } from '$lib/utils/field-mask.util';

  import MaskedTextField from './azuos-masked-text-field.svelte';

  let { mask, initial = '', error = null }: { mask: FieldMask; initial?: string; error?: string | null } =
    $props();

  // svelte-ignore state_referenced_locally
  let value = $state(initial);
</script>

<MaskedTextField
  data={{ label: 'Documento', name: 'document', value }}
  ui={{ mask }}
  state={{ error }}
  actions={{ onChange: (next) => (value = next) }}
/>
<output data-testid="valor">{value}</output>
