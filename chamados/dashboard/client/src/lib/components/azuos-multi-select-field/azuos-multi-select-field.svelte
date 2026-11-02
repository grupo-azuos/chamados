<script lang="ts" module>
  /**
   * Um select em que dá para marcar MAIS DE UMA opção — o filtro "Infraestrutura e Sistemas".
   *
   * O botão tem a mesma cara do select (altura, fundo, seta), mas abre um painel com uma caixa de
   * marcar por opção: marcar não fecha o painel. "Limpar" no rodapé desmarca tudo de uma vez.
   *
   * O rótulo do botão resume a escolha: nada marcado mostra o `placeholder`, um ou dois mostram os
   * nomes e três ou mais viram contagem ("3 áreas"). O leitor de tela recebe a lista inteira no
   * `aria-label`, seja qual for o resumo.
   *
   * `onChange` devolve a lista NA ORDEM DAS OPÇÕES, e não na ordem em que foram marcadas: a mesma
   * escolha vira sempre a mesma lista, o que faz a URL e o cache da consulta serem os mesmos.
   */
  export type AzuosMultiSelectFieldOption = {
    value: string;
    label: string;
    /** A pessoa da opção: quando existe, a foto (ou as iniciais) vem antes do rótulo. */
    personName?: string;
    /** A foto da pessoa. Sem ela, ficam as iniciais de `personName`. */
    avatarUrl?: string | null;
  };

  export type AzuosMultiSelectFieldProps = {
    data: {
      /** Os valores marcados. */
      values: string[];
      options: AzuosMultiSelectFieldOption[];
      /** O que o botão diz sem nada marcado: "Todas as áreas". */
      placeholder: string;
      /** A palavra da contagem, no plural: "áreas" → "3 áreas". */
      noun: string;
    };
    ui?: { ariaLabel?: string; className?: string };
    state?: { isDisabled?: boolean };
    actions: { onChange: (values: string[]) => void };
  };

  /** Os rótulos marcados, na ordem das opções. Valor sem opção não aparece — não tem nome. */
  export function selectedLabels(values: string[], options: AzuosMultiSelectFieldOption[]): string[] {
    return options.filter((option) => values.includes(option.value)).map((option) => option.label);
  }

  /** O resumo da escolha para o botão, pelas regras do cabeçalho deste arquivo. */
  export function summarizeSelection(input: AzuosMultiSelectFieldProps['data']): string {
    const labels = selectedLabels(input.values, input.options);
    if (labels.length === 0) return input.placeholder;
    if (labels.length <= 2) return labels.join(', ');

    return `${labels.length} ${input.noun}`;
  }

  export function targetIndex(step: 1 | -1 | 'first' | 'last', current: number, count: number): number {
    if (step === 'first') return 0;
    if (step === 'last') return count - 1;
    if (current === -1) return 0;

    return (current + step + count) % count;
  }

  const ARROW_STEPS: Record<string, 1 | -1 | 'first' | 'last'> = {
    ArrowDown: 1,
    ArrowUp: -1,
    Home: 'first',
    End: 'last',
  };
</script>

<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import CheckboxField from '$lib/components/azuos-checkbox-field/azuos-checkbox-field.svelte';
  import * as Popover from '$lib/components/ui/popover';
  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions }: AzuosMultiSelectFieldProps = $props();

  const fieldId = `multi-${Math.random().toString(36).slice(2, 9)}`;
  let isOpen = $state(false);

  const fullLabel = $derived.by(() => {
    const labels = selectedLabels(data.values, data.options);

    return labels.length === 0 ? data.placeholder : labels.join(', ');
  });
  const ariaLabel = $derived(ui?.ariaLabel ?? data.placeholder);
  /* Os marcados que são PESSOA, para o botão mostrar os rostos — no máximo três, até onde o
     resumo ainda cabe ao lado. */
  const selectedPeople = $derived(
    data.options
      .filter((option) => option.personName && data.values.includes(option.value))
      .slice(0, 3),
  );

  function toggle(value: string, isChecked: boolean) {
    const isOn = (item: string) => (item === value ? isChecked : data.values.includes(item));
    actions.onChange(data.options.map((option) => option.value).filter(isOn));
  }

  /** Setas e Home/End andam entre as caixas, como num menu. O Tab continua funcionando. */
  function moveFocusWithArrows(event: KeyboardEvent & { currentTarget: HTMLElement }) {
    const step = ARROW_STEPS[event.key];
    if (step === undefined) return;
    const boxes = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="checkbox"]'));
    if (boxes.length === 0) return;
    event.preventDefault();
    boxes[targetIndex(step, boxes.indexOf(document.activeElement as HTMLElement), boxes.length)]?.focus();
  }
</script>

<Popover.Root bind:open={isOpen}>
  <Popover.Trigger
    type="button"
    disabled={fieldState?.isDisabled}
    aria-label={`${ariaLabel}: ${fullLabel}`}
    title={fullLabel}
    class={cn(
      'control-lg rounded-control border-input bg-muted text-foreground flex w-full min-w-40 items-center justify-between gap-2 border px-3 text-sm whitespace-nowrap outline-none',
      'focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
      ui?.className,
    )}
  >
    <span class="flex min-w-0 items-center gap-2">
      <!-- Os rostos de quem está marcado, sobrepostos — no máximo três. -->
      {#if selectedPeople.length > 0}
        <span aria-hidden="true" class="flex shrink-0 -space-x-1.5">
          {#each selectedPeople as person (person.value)}
            <PersonAvatar
              name={person.personName ?? person.label}
              avatarUrl={person.avatarUrl}
              ui={{ size: 'sm', className: 'ring-background ring-2' }}
            />
          {/each}
        </span>
      {/if}
      <span class="min-w-0 truncate">{summarizeSelection(data)}</span>
    </span>
    <ChevronDown class="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
  </Popover.Trigger>
  <Popover.Content align="start" class="w-72 min-w-64 gap-0 p-0">
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <ul role="group" aria-label={ariaLabel} onkeydown={moveFocusWithArrows} class="max-h-72 overflow-y-auto p-2">
      {#each data.options as option (option.value)}
        <li class="hover:bg-accent rounded-box flex items-center gap-2 px-2">
          {#if option.personName}
            <span aria-hidden="true" class="flex shrink-0">
              <PersonAvatar name={option.personName} avatarUrl={option.avatarUrl} ui={{ size: 'sm' }} />
            </span>
          {/if}
          <CheckboxField
            ui={{ className: 'min-w-0 flex-1' }}
            data={{ label: option.label, name: `${fieldId}-${option.value}`, isChecked: data.values.includes(option.value) }}
            actions={{ onChange: (isChecked) => toggle(option.value, isChecked) }}
          />
        </li>
      {/each}
    </ul>
    <div class="border-border flex justify-end border-t px-2 py-1.5">
      <ActionButton
        data={{ label: 'Limpar' }}
        ui={{ variant: 'ghost', size: 'lg' }}
        state={{ isDisabled: data.values.length === 0 }}
        actions={{ onClick: () => actions.onChange([]) }}
      />
    </div>
  </Popover.Content>
</Popover.Root>
