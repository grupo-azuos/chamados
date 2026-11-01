<script lang="ts" module>
  import type { SelectFieldOption } from '$lib/components/azuos-select-field/azuos-select-field.svelte';

  export type AzuosFormSelectFieldOption = SelectFieldOption;

  /**
   * O select do projeto (`AzuosSelectField`) com rótulo, dica e mensagem de erro — o que um
   * formulário precisa e o seletor de filtro não traz.
   *
   * Por baixo só compõe o `AzuosSelectField`: altura, raio e lista vêm dele.
   *
   * O rótulo pode ficar só para leitor de tela (`isLabelHidden`): numa linha de tabela a coluna
   * já diz o que é. Com ele escondido, a mensagem também fica só para o leitor de tela — o motivo
   * já está no `title`.
   *
   * O erro vence a dica: quem errou precisa ler o erro, não o motivo de o campo existir.
   */
  export type AzuosFormSelectFieldProps = {
    data: {
      label: string;
      value: string;
      options: AzuosFormSelectFieldOption[];
      /** Aparece embaixo do campo e no `title`: é o porquê de ele estar desabilitado. */
      hint?: string;
    };
    ui?: { isLabelHidden?: boolean; className?: string };
    state?: { isDisabled?: boolean; error?: string | null; isRequired?: boolean };
    actions?: { onChange?: (value: string) => void };
  };
</script>

<script lang="ts">
  import SelectField from '$lib/components/azuos-select-field/azuos-select-field.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state, actions }: AzuosFormSelectFieldProps = $props();

  const error = $derived(state?.error ?? null);
  const message = $derived(error ?? data.hint ?? null);
  const isLabelHidden = $derived(ui?.isLabelHidden ?? false);
</script>

<div class={cn('flex min-w-0 flex-col gap-1.5', ui?.className)} title={data.hint}>
  <span class={cn('text-ink-700 text-sm font-medium', isLabelHidden && 'sr-only')}>
    {data.label}
    <!-- O `*` é desenho: o leitor de tela já ouve "obrigatório" pelo contexto do formulário. -->
    {#if state?.isRequired}
      <span class="text-destructive" aria-hidden="true">*</span>
    {/if}
  </span>
  <SelectField
    data={{ value: data.value, options: data.options }}
    ui={{
      ariaLabel: data.label,
      className: cn('w-full', error !== null && 'border-border bg-destructive-soft'),
    }}
    state={{ isDisabled: state?.isDisabled ?? false }}
    actions={{ onChange: (value) => actions?.onChange?.(value) }}
  />
  {#if message}
    <p
      role={error !== null ? 'alert' : undefined}
      class={cn(
        'text-xs',
        error !== null ? 'text-destructive font-medium' : 'text-ink-500',
        isLabelHidden && 'sr-only',
      )}
    >
      {message}
    </p>
  {/if}
</div>
