<script lang="ts" module>
  /**
   * A ENTRADA da conferência: um campo para o código do rodapé do documento e um botão.
   *
   * Para quem tem o papel na mão e não o link (nem o QR code). Função pura de props: quem leva
   * para a conferência é o hook.
   */
  export type AzuosServiceOrderLookupFormProps = {
    data: { code: string };
    state?: { error?: string | null };
    actions: {
      onChange: (code: string) => void;
      onSubmit: () => void;
    };
  };
</script>

<script lang="ts">
  import FileCheck from '@lucide/svelte/icons/file-check';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import TextField from '$lib/components/azuos-text-field/azuos-text-field.svelte';

  let { data, state: viewState, actions }: AzuosServiceOrderLookupFormProps = $props();
</script>

<form
  class="bg-card rounded-surface flex flex-col gap-4 border p-5"
  onsubmit={(event) => {
    event.preventDefault();
    actions.onSubmit();
  }}
>
  <TextField
    data={{
      label: 'Código do documento',
      name: 'code',
      value: data.code,
      placeholder: 'Ex.: a1b2c3d4e5f6',
      autoComplete: 'off',
      isRequired: true,
    }}
    state={{ error: viewState?.error, isAutoFocused: true }}
    actions={{ onChange: actions.onChange }}
  />

  <p class="text-ink-500 text-xs">
    O código fica no rodapé da ordem de serviço, ao lado do QR code.
  </p>

  <ActionButton
    data={{ label: 'Conferir documento' }}
    ui={{ icon: FileCheck, className: 'self-start' }}
    actions={{ onClick: actions.onSubmit }}
  />
</form>
