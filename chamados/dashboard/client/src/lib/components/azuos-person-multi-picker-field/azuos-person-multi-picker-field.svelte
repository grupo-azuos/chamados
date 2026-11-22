<script lang="ts" module>
  import { type AzuosPersonPickerPerson } from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';

  /**
   * O CAMPO DE VÁRIAS PESSOAS — o par de `AzuosPersonPickerField` para quando a escolha é de mais
   * de uma (regra `select-standard`): a mesma lista, com a foto de cada um, e os valores são IDs.
   */
  export type AzuosPersonMultiPickerFieldProps = {
    data: { values: string[]; people: AzuosPersonPickerPerson[]; placeholder?: string };
    ui: { ariaLabel: string; className?: string };
    state?: { isDisabled?: boolean };
    actions: { onChange: (ids: string[]) => void };
  };
</script>

<script lang="ts">
  import AzuosMultiSelectField from '$lib/components/azuos-multi-select-field/azuos-multi-select-field.svelte';
  import { personOptions } from '$lib/components/azuos-person-picker-field/azuos-person-picker-field.svelte';

  let { data, ui, state: fieldState, actions }: AzuosPersonMultiPickerFieldProps = $props();
</script>

<AzuosMultiSelectField
  data={{
    values: data.values,
    options: personOptions(data.people),
    placeholder: data.placeholder ?? 'Escolha as pessoas',
    noun: 'pessoas',
  }}
  {ui}
  state={fieldState}
  {actions}
/>
