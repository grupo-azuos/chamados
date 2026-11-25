<!--
  @component
  A ANOTAÇÃO DA TAREFA: o campo em cima da linha do tempo onde a pessoa escreve o que aconteceu
  ("Liguei para a usuária, a máquina fica livre às 14h"). Ao anotar, a linha entra na linha do
  tempo com o nome e a hora de quem escreveu — e não se edita nem se apaga, porque é histórico.

  Função pura de props: não grava nada, só avisa.

  - `data`: `value` (o texto) e `maxLength`.
  - `state`: `isSaving` e `error` (a recusa do servidor).
  - `actions`: `onChange` e `onSubmit`.
-->
<script lang="ts" module>
  export type AzuosTaskNoteFormProps = {
    data: { value: string; maxLength: number };
    state: { isSaving: boolean; error: string | null };
    actions: { onChange: (value: string) => void; onSubmit: () => void };
  };
</script>

<script lang="ts">
  import MessageSquarePlus from '@lucide/svelte/icons/message-square-plus';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import TextAreaField from '$lib/components/azuos-text-area-field/azuos-text-area-field.svelte';

  let { data, state: formState, actions }: AzuosTaskNoteFormProps = $props();

  const isEmpty = $derived(data.value.trim() === '');
</script>

<div class="flex flex-col gap-2">
  <TextAreaField
    data={{
      label: 'Anotação',
      name: 'taskNote',
      value: data.value,
      placeholder: 'O que aconteceu? Ex: liguei para a usuária, a máquina fica livre às 14h',
      maxLength: data.maxLength,
    }}
    ui={{ rows: 2 }}
    state={{ error: formState.error, isDisabled: formState.isSaving }}
    actions={{ onChange: actions.onChange }}
  />
  <div class="flex justify-end">
    <ActionButton
      data={{ label: 'Anotar', loadingLabel: 'Anotando…' }}
      ui={{ variant: 'secondary', size: 'sm', icon: MessageSquarePlus }}
      state={{ isLoading: formState.isSaving, isDisabled: isEmpty }}
      actions={{ onClick: actions.onSubmit }}
    />
  </div>
</div>
