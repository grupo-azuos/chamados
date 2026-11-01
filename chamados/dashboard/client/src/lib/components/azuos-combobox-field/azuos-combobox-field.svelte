<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';

  /**
   * Campo de seleção COM PESQUISA — para a lista em que rolar até achar não é viável: dezenas de
   * departamentos, de etiquetas, de responsáveis. Para meia dúzia de opções fixas o
   * `AzuosSelectField` continua certo; abrir um campo de busca para três itens é ruído.
   *
   * A SEGUNDA VARIANTE nasce de `actions.onCreate`, não de uma prop de modo. Quando a tela passa
   * essa ação, o que a pessoa digitou e não encontrou vira uma linha "Criar «termo»" no fim da
   * lista; quando não passa, o campo é só busca. O componente continua puro: ele avisa, não cria.
   */
  export type AzuosComboboxFieldOption = { value: string; label: string; icon?: LucideIcon };

  export type AzuosComboboxFieldProps = {
    data: { value: string; options: AzuosComboboxFieldOption[] };
    ui?: {
      placeholder?: string;
      searchPlaceholder?: string;
      emptyLabel?: string;
      createLabel?: string;
      ariaLabel?: string;
      /** O id do gatilho, para um `<label for>` de fora apontar para ele. */
      id?: string;
      /** O id da mensagem que descreve o campo (o erro, a dica), para o leitor de tela. */
      describedBy?: string;
      className?: string;
    };
    state?: { isDisabled?: boolean; isInvalid?: boolean };
    actions: { onChange: (value: string) => void; onCreate?: (label: string) => void };
  };

  /**
   * Oferecer criar? Só quando a tela deu a ação, há algo digitado, e esse nome ainda não existe na
   * lista — duas etiquetas "Urgente" é um problema que nasce aqui e só aparece depois, no banco. A
   * comparação ignora maiúsculas porque quem digita não pensa nelas.
   */
  export function canCreateOption(
    options: AzuosComboboxFieldOption[],
    typed: string,
    onCreate?: (label: string) => void,
  ): boolean {
    if (!onCreate || typed === '') return false;

    return !options.some((option) => option.label.toLowerCase() === typed.toLowerCase());
  }
</script>

<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import Plus from '@lucide/svelte/icons/plus';

  import * as Command from '$lib/components/ui/command';
  import * as Popover from '$lib/components/ui/popover';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions }: AzuosComboboxFieldProps = $props();

  let isOpen = $state(false);
  let term = $state('');

  const selectedOption = $derived(data.options.find((option) => option.value === data.value));
  const typed = $derived(term.trim());
  const canCreate = $derived(canCreateOption(data.options, typed, actions.onCreate));
  const SelectedIcon = $derived(selectedOption?.icon);

  /* Fechar limpa a busca: reabrir com o termo antigo ainda filtrando mostra uma lista quase
     vazia, e a pessoa não entende para onde foram as opções. */
  function changeOpen(next: boolean) {
    isOpen = next;
    if (!next) term = '';
  }

  function choose(value: string) {
    actions.onChange(value);
    changeOpen(false);
  }

  function create() {
    actions.onCreate?.(typed);
    changeOpen(false);
  }
</script>

<Popover.Root bind:open={() => isOpen, changeOpen}>
  <!-- O degrau `lg` da RÉGUA DE MEDIDAS: este campo fica ao lado de um `AzuosTextField` e precisa
       nascer na mesma altura e no mesmo raio dos vizinhos. -->
  <Popover.Trigger>
    {#snippet child({ props })}
      <button
        {...props}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        id={ui?.id}
        aria-label={ui?.ariaLabel}
        aria-invalid={fieldState?.isInvalid || undefined}
        aria-describedby={ui?.describedBy}
        disabled={fieldState?.isDisabled}
        title={selectedOption?.label}
        class={cn(
          'control-lg rounded-control border-input bg-muted text-foreground flex w-full max-w-full min-w-0 items-center justify-between gap-2 border px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none',
          'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          ui?.className,
        )}
      >
        <span class={cn('flex min-w-0 items-center gap-2', !selectedOption && 'text-muted-foreground')}>
          {#if SelectedIcon}
            <SelectedIcon class="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
          {/if}
          <span class="truncate">{selectedOption?.label || ui?.placeholder || ''}</span>
        </span>
        <ChevronsUpDown class="size-4 shrink-0 opacity-50" aria-hidden="true" />
      </button>
    {/snippet}
  </Popover.Trigger>
  <!-- A LARGURA DA LISTA É A DO GATILHO: sem amarrar, ela se estica até o nome mais comprido e
       nasce mais larga que o diálogo em volta. -->
  <Popover.Content align="start" matchAnchorWidth class="p-0">
    <!-- O filtro é o do próprio Command, por semelhança — "ana s" ainda acha "Ana Souza". -->
    <Command.Root>
      <Command.Input bind:value={term} placeholder={ui?.searchPlaceholder ?? 'Pesquisar…'} />
      <Command.List>
        <Command.Empty>{ui?.emptyLabel ?? 'Nada encontrado.'}</Command.Empty>
        <Command.Group>
          {#each data.options as option (option.value)}
            {@const OptionIcon = option.icon}
            <Command.Item value={option.label} onSelect={() => choose(option.value)}>
              <Check
                class={cn('size-4 shrink-0', option.value !== data.value && 'opacity-0')}
                aria-hidden="true"
              />
              {#if OptionIcon}
                <OptionIcon class="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
              {/if}
              <span class="truncate">{option.label}</span>
            </Command.Item>
          {/each}
          <!-- O `value` é o próprio termo para que o filtro nunca esconda a linha de criar: ela é
               justamente a saída de quem não achou o que procurava. -->
          {#if canCreate}
            <Command.Item value={typed} onSelect={create}>
              <Plus class="size-4 shrink-0" aria-hidden="true" />
              <span class="truncate">{ui?.createLabel ?? 'Criar'} “{typed}”</span>
            </Command.Item>
          {/if}
        </Command.Group>
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
