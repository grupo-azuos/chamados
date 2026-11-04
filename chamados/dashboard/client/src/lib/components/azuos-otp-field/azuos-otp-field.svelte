<script lang="ts" module>
  /**
   * O CÓDIGO DE SEIS NÚMEROS, uma caixa por dígito.
   *
   * Seis caixas em vez de um campo só porque o código chega para ser COPIADO de um e-mail e
   * conferido dígito a dígito: a caixa vazia é visível de longe.
   *
   * Controlado por um valor só — a string inteira —, e não por seis estados: costurar seis
   * estados a cada tecla é onde nascem os códigos com um dígito fora de ordem.
   *
   * - **Colar funciona**: o código colado inteiro preenche todas as caixas.
   * - **Apagar volta**: `Backspace` numa caixa vazia vai para a anterior e apaga lá.
   * - **`autocomplete="one-time-code"`** só na PRIMEIRA caixa, onde o celular procura.
   * - **`inputmode="numeric"`** abre o teclado numérico no celular.
   */
  export type AzuosOtpFieldProps = {
    data: {
      label: string;
      /** O código inteiro, do tamanho que estiver: uma caixa por posição. */
      value: string;
      length: number;
    };
    ui?: { className?: string };
    state?: { error?: string | null; isDisabled?: boolean; isAutoFocused?: boolean };
    actions?: {
      onChange?: (value: string) => void;
      /** Chamado quando a última caixa é preenchida — é o que permite conferir sem clicar. */
      onComplete?: (value: string) => void;
    };
  };

  export function onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
  }

  /** O valor vira um vetor de tamanho fixo: posição vazia é caixa vazia, e não caixa que sumiu. */
  export function toDigits(value: string, length: number): string[] {
    return Array.from({ length }, (_, index) => value[index] ?? '');
  }

  /**
   * Escreve a partir de uma posição e devolve o código inteiro. O valor é uma string de dígitos,
   * sem buraco: apagar uma caixa do meio junta o que sobrou à esquerda.
   */
  export function replaceFrom(digits: string[], index: number, typed: string, length: number): string {
    const next = [...digits];
    for (let offset = 0; offset < typed.length && index + offset < length; offset += 1) {
      next[index + offset] = typed[offset] ?? '';
    }

    return next.join('');
  }

  export function eraseAt(digits: string[], index: number): string {
    const next = [...digits];
    next[index] = '';

    return next.join('');
  }
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions }: AzuosOtpFieldProps = $props();

  const groupId = `otp-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${groupId}-error`;
  const inputs: (HTMLInputElement | null)[] = $state([]);

  const digits = $derived(toDigits(data.value, data.length));
  const error = $derived(fieldState?.error ?? null);
  const hasError = $derived(Boolean(error));

  function commit(next: string) {
    actions?.onChange?.(next);
    if (next.length === data.length) actions?.onComplete?.(next);
  }

  function focusAt(index: number) {
    inputs[Math.min(Math.max(index, 0), data.length - 1)]?.focus();
  }

  function handleInput(index: number, event: Event & { currentTarget: HTMLInputElement }) {
    const typed = onlyDigits(event.currentTarget.value);
    /* A caixa volta a mostrar o que o valor diz: letra recusada não fica na tela. */
    event.currentTarget.value = digits[index] ?? '';
    if (typed === '') return;
    /* Mais de um dígito numa caixa só é o autopreenchimento entregando o código inteiro. */
    commit(replaceFrom(digits, index, typed, data.length));
    focusAt(index + typed.length);
  }

  function handleKeyDown(index: number, event: KeyboardEvent) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      focusAt(index + (event.key === 'ArrowLeft' ? -1 : 1));
      return;
    }
    if (event.key !== 'Backspace') return;
    event.preventDefault();
    /* Caixa cheia: apaga aqui e fica. Caixa vazia: volta uma e apaga lá. */
    const target = digits[index] === '' ? index - 1 : index;
    if (target < 0) return;
    commit(eraseAt(digits, target));
    focusAt(target);
  }

  function handlePaste(event: ClipboardEvent) {
    const pasted = onlyDigits(event.clipboardData?.getData('text') ?? '');
    if (pasted === '') return;
    event.preventDefault();
    const next = pasted.slice(0, data.length);
    commit(next);
    focusAt(next.length);
  }
</script>

<div class={cn('flex flex-col gap-1.5', ui?.className)}>
  <span id={groupId} class="text-ink-700 text-sm font-medium">{data.label}</span>
  <!-- As caixas DIVIDEM a largura que existe (`flex-1`), com teto de 48px: seis caixas fixas de
       48px estouravam a tela de 320px. -->
  <div role="group" aria-labelledby={groupId} class="flex justify-between gap-1.5 sm:gap-2">
    {#each digits as digit, index (index)}
      <!-- svelte-ignore a11y_autofocus -->
      <input
        bind:this={inputs[index]}
        value={digit}
        disabled={fieldState?.isDisabled}
        autofocus={fieldState?.isAutoFocused && index === 0}
        inputmode="numeric"
        autocomplete={index === 0 ? 'one-time-code' : 'off'}
        maxlength={data.length}
        aria-label={`Dígito ${index + 1} de ${data.length}`}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        oninput={(event) => handleInput(index, event)}
        onkeydown={(event) => handleKeyDown(index, event)}
        onpaste={handlePaste}
        onfocus={(event) => event.currentTarget.select()}
        class={cn(
          'rounded-control aspect-square w-full max-w-12 min-w-0 flex-1 border text-center text-lg font-semibold transition-colors',
          'focus-visible:ring-ring/50 focus:ring-[3px] focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-60',
          hasError ? 'border-border bg-destructive-soft text-destructive' : 'border-input bg-muted text-foreground',
        )}
      />
    {/each}
  </div>
  {#if hasError}
    <p id={errorId} role="alert" class="text-destructive text-sm">{error}</p>
  {/if}
</div>
