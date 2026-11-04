<script lang="ts" module>
  import type { FieldMask } from '$lib/utils/field-mask.util';

  /**
   * O CAMPO COM MÁSCARA — CPF, CIN, CNPJ, CEP, CNAE, dinheiro, quantidade, CNH, telefone. O mesmo
   * rótulo, a mesma régua e o mesmo erro colado do `AzuosTextField`; muda o que acontece a cada
   * tecla.
   *
   * - A pontuação entra sozinha enquanto se digita ou cola ("12345678909" → "123.456.789-09").
   * - Letra não entra em campo de número, e o que passa do tamanho é cortado.
   * - O cursor não pula para o fim quando se corrige um dígito no meio.
   * - O ERRO DE FORMATO aparece quando a pessoa SAI do campo, ou quando ele fica completo e não
   *   fecha (CPF com o dígito verificador errado). Incompleto não é errado, é alguém no meio do
   *   trabalho.
   *
   * `state.error` é o erro de QUEM USA o campo (obrigatório, por exemplo) e ganha do de formato.
   */
  export type AzuosMaskedTextFieldProps = {
    data: { label: string; name: string; value: string; placeholder?: string; isRequired?: boolean };
    ui: { mask: FieldMask; className?: string; ariaLabel?: string };
    state?: { error?: string | null; isDisabled?: boolean };
    actions: { onChange: (value: string) => void; onBlur?: () => void };
  };

  const PLACEHOLDERS: Partial<Record<FieldMask, string>> = {
    cpf: '000.000.000-00',
    cin: '000.000.000-00 (número do CPF)',
    cnpj: '00.000.000/0000-00',
    cep: '00000-000',
    cnae: '0000-0/00',
    money: '0,00',
    phone: '62 90000-0000',
  };

  /** Dinheiro e CNPJ (alfanumérico) abrem o teclado certo no celular; o resto, só números. */
  const INPUT_MODES: Record<FieldMask, 'numeric' | 'decimal' | 'text'> = {
    cpf: 'numeric',
    cin: 'numeric',
    cnpj: 'text',
    cep: 'numeric',
    cnae: 'numeric',
    money: 'decimal',
    integer: 'numeric',
    cnh: 'numeric',
    phone: 'numeric',
  };
</script>

<script lang="ts">
  import { tick } from 'svelte';

  import { fieldMaskError, formatStoredFieldMask, handleFieldMask } from '$lib/utils/field-mask.util';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions }: AzuosMaskedTextFieldProps = $props();

  const inputId = `masked-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${inputId}-error`;

  let isTouched = $state(false);

  const displayed = $derived(formatStoredFieldMask(ui.mask, data.value));
  const error = $derived(fieldState?.error ?? (isTouched ? fieldMaskError(ui.mask, data.value) : null));
  const hasError = $derived(Boolean(error));

  async function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
    const field = event.currentTarget;
    const result = handleFieldMask(ui.mask, { value: field.value, selectionStart: field.selectionStart });
    /* Completo e errado já avisa sem esperar sair do campo: o CPF fechou com o dígito trocado. */
    if (result.isComplete && result.error) isTouched = true;
    actions.onChange(result.value);

    /* O campo mostra o que a máscara escreveu — mesmo quando a tecla foi recusada e o valor não
       mudou (aí nada se repintaria sozinho) — e o cursor volta para onde a máscara calculou, e
       não para o fim. */
    await tick();
    field.value = result.value;
    field.setSelectionRange(result.selectionStart, result.selectionStart);
  }

  function handleBlur() {
    isTouched = true;
    actions.onBlur?.();
  }
</script>

<div class={cn('flex flex-col gap-1.5', ui.className)}>
  <label for={inputId} class="text-ink-700 text-sm font-medium">
    {data.label}
    {#if data.isRequired}
      <span class="text-destructive" aria-hidden="true">*</span>
    {/if}
  </label>
  <input
    id={inputId}
    name={data.name}
    type="text"
    inputmode={INPUT_MODES[ui.mask]}
    autocomplete="off"
    value={displayed}
    placeholder={data.placeholder ?? PLACEHOLDERS[ui.mask]}
    disabled={fieldState?.isDisabled}
    required={data.isRequired}
    aria-label={ui.ariaLabel}
    aria-invalid={hasError}
    aria-describedby={hasError ? errorId : undefined}
    oninput={handleInput}
    onblur={handleBlur}
    class={cn(
      'control-lg rounded-control text-foreground w-full border text-sm tabular-nums transition-colors',
      'placeholder:text-ink-500 disabled:cursor-not-allowed disabled:opacity-60',
      hasError ? 'border-border bg-destructive-soft' : 'border-input bg-muted text-foreground',
    )}
  />
  {#if hasError}
    <p id={errorId} role="alert" class="text-destructive text-xs font-medium">{error}</p>
  {/if}
</div>
