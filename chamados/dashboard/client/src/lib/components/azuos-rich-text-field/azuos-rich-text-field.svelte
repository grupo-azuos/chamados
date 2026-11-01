<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';

  /**
   * O campo de texto com RECURSOS A MAIS que o `AzuosTextField` não tem: dica embaixo
   * (`data.hint`), ícone de lupa com Enter (`ui.icon` + `actions.onSubmit`), limite de caracteres,
   * `inputMode` e o tipo `month`. Sem nenhum desses, use o `AzuosTextField`.
   *
   * Este arquivo também é o KIT DE CAMPO: `FIELD_CONTROL_CLASS`, `HINT_TONES` e as folgas são o
   * que o campo de sugestões e os de data usam para ficar na mesma família visual.
   *
   * O erro fica COLADO no campo, e não num resumo no topo. A dica é a linha miúda que explica de
   * onde o valor veio ("Calculado: 45 dias a partir do início."); ela sai quando há erro — duas
   * mensagens embaixo do mesmo campo competem, e a que importa é a do erro.
   */

  /** A altura do rótulo mais o vão até o campo — para encostar um controle SEM rótulo na mesma
   * linha de um COM rótulo. 20px do `text-sm` mais 6px do `gap-1.5`. */
  export const FIELD_LABEL_OFFSET = 'mt-[1.625rem]';
  /** A mesma folga só a partir de `sm`, para a fileira que empilha no celular. Constante
   * própria: o Tailwind não enxerga classe montada em tempo de execução. */
  export const FIELD_LABEL_OFFSET_SM = 'sm:mt-[1.625rem]';
  /** A altura do degrau `control-lg` (40px), para um BOTÃO na mesma linha de um campo. */
  export const FIELD_ROW_BUTTON = 'h-10';
  /** A CAIXA DE UM CAMPO — fundo, borda, canto, altura e texto. Os campos ficam lado a lado na
   * grade do formulário, e caixa diferente é o que faz a fileira parecer torta. */
  export const FIELD_CONTROL_CLASS =
    'control-lg rounded-control bg-muted text-foreground w-full border text-sm transition-colors';
  /** O recusado: fundo vermelho claro, borda neutra — borda colorida é proibida no grupo. */
  export const CHOICE_ERROR_CLASS = 'border-border bg-destructive-soft';

  export type AzuosRichTextFieldType = 'text' | 'email' | 'password' | 'date' | 'month' | 'tel';

  export type AzuosRichTextFieldHint = { text: string; tone: 'neutral' | 'calculated' | 'error' };

  /** A dica em tom de erro é ÂMBAR, e não vermelha: ela avisa, mas não trava o envio. */
  export const HINT_TONES: Record<AzuosRichTextFieldHint['tone'], string> = {
    neutral: 'text-ink-500',
    calculated: 'text-brand-blue-800',
    error: 'text-warning',
  };

  export type AzuosRichTextFieldProps = {
    data: {
      label: string;
      name: string;
      value: string;
      placeholder?: string;
      autoComplete?: HTMLInputAttributes['autocomplete'];
      hint?: AzuosRichTextFieldHint | null;
      maxLength?: number;
      inputMode?: HTMLInputAttributes['inputmode'];
    };
    ui?: {
      type?: AzuosRichTextFieldType;
      className?: string;
      /** Um ícone DENTRO do campo, à esquerda — a lupa da busca. Com `onSubmit` vira botão. */
      icon?: LucideIcon;
    };
    state?: {
      error?: string | null;
      isDisabled?: boolean;
      isAutoFocused?: boolean;
      /** Mostra o asterisco e avisa o leitor de tela. Quem RECUSA o vazio é o schema. */
      isRequired?: boolean;
    };
    actions?: {
      onChange?: (value: string) => void;
      onBlur?: () => void;
      /** O Enter do campo de busca — e o clique na lupa, que vira botão quando isto existe. */
      onSubmit?: () => void;
    };
  };
</script>

<script lang="ts">
  import Eye from '@lucide/svelte/icons/eye';
  import EyeOff from '@lucide/svelte/icons/eye-off';

  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions }: AzuosRichTextFieldProps = $props();

  let isRevealed = $state(false);

  const inputId = `rich-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const type = $derived(ui?.type ?? 'text');
  const isPassword = $derived(type === 'password');
  const error = $derived(fieldState?.error ?? null);
  const hasError = $derived(Boolean(error));
  const hint = $derived(hasError ? null : (data.hint ?? null));
  const Icon = $derived(ui?.icon);
  /* Revelar troca o `type`, e não um CSS: com `-webkit-text-security` o gerenciador de senhas
     do navegador deixa de reconhecer o campo. */
  const inputType = $derived(isPassword && isRevealed ? 'text' : type);
  const describedBy = $derived(hasError ? errorId : hint ? hintId : undefined);
  const iconPlace = 'text-ink-500 absolute top-1/2 left-3 size-4 -translate-y-1/2';

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || !actions?.onSubmit) return;
    /* Sem o `preventDefault` o Enter mandaria o formulário em volta, se houver um. */
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<div class={cn('flex flex-col gap-1.5', ui?.className)}>
  <label for={inputId} class="text-ink-700 text-sm font-medium">
    {data.label}
    {#if fieldState?.isRequired}
      <span class="text-destructive" aria-hidden="true"> *</span>
    {/if}
  </label>
  <div class="relative">
    {#if Icon && actions?.onSubmit}
      <button
        type="button"
        aria-label="Pesquisar"
        title="Pesquisar"
        onclick={actions.onSubmit}
        class={cn(
          iconPlace,
          'hover:text-ink-700 focus-visible:ring-ring rounded-chip cursor-pointer after:absolute after:-inset-3 focus-visible:ring-2 focus-visible:outline-none',
        )}
      >
        <Icon aria-hidden="true" class="size-4" />
      </button>
    {:else if Icon}
      <Icon aria-hidden="true" class={cn(iconPlace, 'pointer-events-none')} />
    {/if}
    <!-- svelte-ignore a11y_autofocus -->
    <input
      id={inputId}
      name={data.name}
      type={inputType}
      value={data.value}
      placeholder={data.placeholder}
      autocomplete={data.autoComplete}
      maxlength={data.maxLength}
      inputmode={data.inputMode}
      autofocus={fieldState?.isAutoFocused}
      disabled={fieldState?.isDisabled}
      required={fieldState?.isRequired}
      aria-invalid={hasError}
      aria-describedby={describedBy}
      oninput={(event) => actions?.onChange?.(event.currentTarget.value)}
      onblur={() => actions?.onBlur?.()}
      onkeydown={handleKeyDown}
      class={cn(
        FIELD_CONTROL_CLASS,
        'placeholder:text-ink-500 disabled:cursor-not-allowed disabled:opacity-60',
        isPassword && 'pr-11',
        Icon && 'pl-9',
        hasError ? 'border-border bg-destructive-soft' : 'border-input',
      )}
    />
    <!-- `tabindex="-1"`: no teclado, a tecla seguinte à senha precisa ser o botão de entrar. -->
    {#if isPassword}
      <button
        type="button"
        tabindex={-1}
        onclick={() => (isRevealed = !isRevealed)}
        aria-label={isRevealed ? 'Ocultar senha' : 'Mostrar senha'}
        class="text-ink-500 hover:text-ink-700 absolute inset-y-0 right-0 flex w-11 items-center justify-center"
      >
        {#if isRevealed}
          <EyeOff class="size-4" aria-hidden="true" />
        {:else}
          <Eye class="size-4" aria-hidden="true" />
        {/if}
      </button>
    {/if}
  </div>
  {#if hasError}
    <p id={errorId} role="alert" class="text-destructive text-xs font-medium">{error}</p>
  {/if}
  {#if hint}
    <p id={hintId} aria-live="polite" class={cn('text-xs font-medium', HINT_TONES[hint.tone])}>
      {hint.text}
    </p>
  {/if}
</div>
