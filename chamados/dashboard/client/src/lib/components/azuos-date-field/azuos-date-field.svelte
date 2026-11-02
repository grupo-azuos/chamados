<script lang="ts" module>
  import { isIsoWithin, isoFromDisplay, rangeHint } from '$lib/utils/date-input.util';

  /**
   * O campo de UMA data: a pessoa DIGITA `dd/mm/aaaa` ou toca no calendário, que pergunta o ano,
   * depois o mês, depois o dia (`AzuosDateStepper`).
   *
   * Quem sabe a data de cor digita oito números e as barras entram sozinhas. Quem prefere escolher
   * não cai num calendário aberto no mês de hoje, onde é fácil marcar o dia e esquecer o ano.
   *
   * O VALOR ENTRA E SAI COMO TEXTO ISO (`1990-03-25`). O campo escondido leva o ISO no `name`; o
   * campo que se vê não tem `name`, para o formulário nativo não enviar a data duas vezes.
   *
   * Enquanto a pessoa digita, o texto é dela: a data só é entregue quando fica completa e válida,
   * e o aviso de data inválida só aparece ao sair do campo.
   */
  export type AzuosDateFieldProps = {
    data: {
      label: string;
      name: string;
      /** A data em ISO (`1990-03-25`), ou vazio quando ninguém informou. */
      value: string | null;
      /** A primeira data aceita, em ISO. */
      min?: string;
      /** A última data aceita, em ISO. */
      max?: string;
      /** Pinta um `*` vermelho depois do rótulo. */
      isRequired?: boolean;
    };
    ui?: {
      /** O ano em que o calendário abre quando o campo está vazio. */
      startYear?: number;
      className?: string;
      /** Esconde o rótulo da vista, mas não do leitor de tela. */
      isLabelHidden?: boolean;
    };
    state?: { error?: string | null; isDisabled?: boolean };
    actions: { onChange: (value: string | null) => void; onBlur?: () => void };
  };

  export const INVALID_DATE = 'Data inválida. Digite o dia, o mês e o ano, como 25/03/1990.';

  /** O que há de errado com o texto digitado — ou nada, se está vazio ou é uma data aceita. */
  export function typedProblem(text: string | null, min?: string, max?: string): string | null {
    if (!text) return null;
    const iso = isoFromDisplay(text);
    if (!iso) return INVALID_DATE;
    if (!isIsoWithin(iso, min, max)) return rangeHint(min, max);

    return null;
  }

  export function completedIso(text: string, min?: string, max?: string): string | null {
    const iso = isoFromDisplay(text);

    return iso && isIsoWithin(iso, min, max) ? iso : null;
  }
</script>

<script lang="ts">
  import CalendarIcon from '@lucide/svelte/icons/calendar';

  import DateStepper from '$lib/components/azuos-date-stepper/azuos-date-stepper.svelte';
  import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '$lib/components/ui/input-group';
  import * as Popover from '$lib/components/ui/popover';
  import { displayFromIso, maskDateInput } from '$lib/utils/date-input.util';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions }: AzuosDateFieldProps = $props();

  const inputId = `date-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${inputId}-error`;

  /* `draft` é o texto no meio da digitação. `null` quer dizer "ninguém está digitando": o campo
     mostra a data que veio de fora. */
  let draft = $state<string | null>(null);
  let typedError = $state<string | null>(null);
  let isOpen = $state(false);

  const error = $derived(fieldState?.error ?? typedError);
  const hasError = $derived(Boolean(error));

  function type(raw: string) {
    const text = maskDateInput(raw);
    draft = text;
    typedError = null;
    if (text === '') {
      actions.onChange(null);
      return;
    }
    const iso = completedIso(text, data.min, data.max);
    if (iso) actions.onChange(iso);
  }

  function leave() {
    const problem = typedProblem(draft, data.min, data.max);
    typedError = problem;
    /* Com problema, o texto digitado fica no campo para a pessoa corrigir. */
    if (!problem) draft = null;
    actions.onBlur?.();
  }

  function pick(iso: string) {
    actions.onChange(iso);
    draft = null;
    typedError = null;
    isOpen = false;
  }
</script>

<div class={cn('flex flex-col gap-1.5', ui?.className)}>
  <label for={inputId} class={cn('text-ink-700 text-sm font-medium', ui?.isLabelHidden && 'sr-only')}>
    {data.label}
    {#if data.isRequired}
      <span class="text-destructive" aria-hidden="true">*</span>
    {/if}
  </label>
  <input type="hidden" name={data.name} value={data.value ?? ''} />
  <!-- `px-0!`: quem dá o respiro lateral aqui é o input de dentro e o botão do calendário. -->
  <!-- O fundo repete na variante `dark:`: o `ui/input-group` traz `dark:bg-input/30`, que vencia o
       `bg-muted` no tema escuro e deixava a data mais clara que os outros campos. -->
  <InputGroup
    class={cn(
      'control-lg rounded-control px-0!',
      hasError ? 'bg-destructive-soft dark:bg-destructive-soft' : 'bg-muted dark:bg-muted',
    )}
  >
    <InputGroupInput
      id={inputId}
      class="text-foreground"
      inputmode="numeric"
      autocomplete="off"
      placeholder="dd/mm/aaaa"
      maxlength={10}
      value={draft ?? displayFromIso(data.value)}
      disabled={fieldState?.isDisabled}
      required={data.isRequired}
      aria-invalid={hasError}
      aria-describedby={hasError ? errorId : undefined}
      oninput={(event: Event & { currentTarget: HTMLInputElement }) => type(event.currentTarget.value)}
      onblur={leave}
    />
    <InputGroupAddon align="inline-end">
      <Popover.Root bind:open={isOpen}>
        <Popover.Trigger>
          {#snippet child({ props })}
            <InputGroupButton
              {...props}
              size="icon-sm"
              disabled={fieldState?.isDisabled}
              aria-label={`Escolher ${data.label} no calendário`}
              class="control-icon-sm rounded-chip text-ink-500 hover:text-ink-900"
            >
              <CalendarIcon aria-hidden="true" />
            </InputGroupButton>
          {/snippet}
        </Popover.Trigger>
        <Popover.Content align="end" class="rounded-surface border-border bg-card w-auto p-0 shadow-xl">
          <DateStepper
            data={{ value: data.value, min: data.min, max: data.max }}
            ui={{ startYear: ui?.startYear }}
            actions={{ onChange: pick }}
          />
        </Popover.Content>
      </Popover.Root>
    </InputGroupAddon>
  </InputGroup>
  {#if error}
    <p id={errorId} role="alert" class="text-destructive text-xs font-medium">{error}</p>
  {/if}
</div>
