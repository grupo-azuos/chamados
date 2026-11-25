<script lang="ts" module>
  import {
    type AzuosComboboxFieldOption,
  } from '$lib/components/azuos-combobox-field/azuos-combobox-field.svelte';

  /** Uma pessoa da lista do sistema. O campo guarda o `id`. */
  export type AzuosPersonPickerPerson = { id: string; name: string; photo: string | null };

  /**
   * O CAMPO DE UMA PESSOA — o único jeito de escolher alguém neste sistema (regra
   * `select-standard`): a lista de quem tem acesso, com a foto, com busca, e o valor é o ID.
   *
   * Não há variante sem foto nem caixa de texto: o nome digitado errado é um filtro que nunca
   * acha ninguém, e o nome que muda deixa o registro para trás. `leading` põe opções antes das
   * pessoas ("(Nenhum)", "Eu") — com o mesmo valor-texto que a tela entende.
   */
  export type AzuosPersonPickerFieldProps = {
    data: {
      value: string;
      people: AzuosPersonPickerPerson[];
      leading?: AzuosComboboxFieldOption[];
    };
    ui: { ariaLabel: string; placeholder?: string; id?: string; className?: string };
    state?: { isDisabled?: boolean; isInvalid?: boolean };
    actions: { onChange: (id: string) => void };
  };

  /** Cada pessoa como opção com foto (ou iniciais) — o mesmo desenho em todo campo de pessoa. */
  export function personOptions(people: AzuosPersonPickerPerson[]): AzuosComboboxFieldOption[] {
    return people.map((person) => ({
      value: person.id,
      label: person.name,
      personName: person.name,
      avatarUrl: person.photo,
    }));
  }
</script>

<script lang="ts">
  import AzuosComboboxField from '$lib/components/azuos-combobox-field/azuos-combobox-field.svelte';

  let { data, ui, state: fieldState, actions }: AzuosPersonPickerFieldProps = $props();
</script>

<AzuosComboboxField
  data={{ value: data.value, options: [...(data.leading ?? []), ...personOptions(data.people)] }}
  ui={{
    ariaLabel: ui.ariaLabel,
    id: ui.id,
    placeholder: ui.placeholder ?? 'Escolha a pessoa',
    searchPlaceholder: 'Buscar pessoa...',
    emptyLabel: 'Ninguém com esse nome',
    className: ui.className,
  }}
  state={fieldState}
  actions={{ onChange: actions.onChange }}
/>
