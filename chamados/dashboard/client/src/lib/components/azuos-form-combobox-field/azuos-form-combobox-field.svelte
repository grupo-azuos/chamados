<script lang="ts" module>
  import type { AzuosComboboxFieldOption } from '$lib/components/azuos-combobox-field/azuos-combobox-field.svelte';

  export type AzuosFormComboboxFieldOption = AzuosComboboxFieldOption;

  /**
   * O campo com pesquisa (`AzuosComboboxField`) com rótulo, dica e mensagem de erro — o mesmo que
   * o `AzuosFormSelectField` faz pelo select, para formulário.
   *
   * Existe para listas longas como departamento: rolar até achar não é viável. Por baixo só compõe
   * o `AzuosComboboxField`; aqui entram só o rótulo e a mensagem.
   *
   * O `onBlur` é chamado ao escolher, e não ao sair do gatilho: num campo de lista a escolha É o
   * fim da edição.
   */
  export type AzuosFormComboboxFieldProps = {
    data: {
      /** Sem rótulo visível (o campo ao lado já diz o que é), o nome vai em `ui.ariaLabel`. */
      label?: string;
      value: string;
      options: AzuosFormComboboxFieldOption[];
      /** Aparece embaixo do campo: o porquê de a lista estar curta, ou de o campo estar travado. */
      hint?: string | null;
    };
    ui?: {
      placeholder?: string;
      searchPlaceholder?: string;
      emptyLabel?: string;
      ariaLabel?: string;
      className?: string;
    };
    state?: { isDisabled?: boolean; error?: string | null; isRequired?: boolean };
    actions: { onChange: (value: string) => void; onBlur?: () => void };
  };
</script>

<script lang="ts">
  import ComboboxField from '$lib/components/azuos-combobox-field/azuos-combobox-field.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions }: AzuosFormComboboxFieldProps = $props();

  const messageId = `form-combobox-${Math.random().toString(36).slice(2, 9)}`;
  /* O erro vence a dica: quem errou precisa ler o erro, não o motivo de a lista estar curta. */
  const error = $derived(fieldState?.error ?? null);
  const message = $derived(error ?? data.hint ?? null);
</script>

<div class={cn('flex min-w-40 flex-col gap-1.5', ui?.className)}>
  {#if data.label}
    <span class="text-ink-700 text-sm font-medium">
      {data.label}
      {#if fieldState?.isRequired}
        <span class="text-destructive" aria-hidden="true">*</span>
      {/if}
    </span>
  {/if}
  <ComboboxField
    data={{ value: data.value, options: data.options }}
    ui={{
      placeholder: ui?.placeholder ?? 'Selecione…',
      searchPlaceholder: ui?.searchPlaceholder,
      emptyLabel: ui?.emptyLabel,
      ariaLabel: data.label ?? ui?.ariaLabel,
      describedBy: message ? messageId : undefined,
      className: cn(error !== null && 'border-border bg-destructive-soft'),
    }}
    state={{ isDisabled: fieldState?.isDisabled, isInvalid: error !== null }}
    actions={{
      onChange: (value) => {
        actions.onChange(value);
        actions.onBlur?.();
      },
    }}
  />
  {#if message}
    <p
      id={messageId}
      role={error !== null ? 'alert' : undefined}
      class={cn('text-xs', error !== null ? 'text-destructive font-medium' : 'text-ink-500')}
    >
      {message}
    </p>
  {/if}
</div>
