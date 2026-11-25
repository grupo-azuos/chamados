<!--
  @component
  O seletor de mês e o de ano no título de um calendário — uma lista NOSSA, no lugar do select
  nativo que o calendário baixado traz.

  O nativo abre a lista do sistema operacional: outra fonte, outra cor, e num ano com cem opções
  uma lista que cobre a tela inteira. E o `AzuosSelectField` não serve aqui: ele abre a lista numa
  camada flutuante própria, por cima do balão do calendário, e as duas camadas disputam o foco e o
  clique de fora — a lista fecha o balão, ou não fecha nunca.

  Esta lista é desenhada DENTRO do painel, sem camada nova: não há o que disputar. Ela fecha ao
  escolher e ao perder o foco (clique em qualquer outro ponto do painel).

  AS PROPS NÃO SEGUEM `data/ui/state/actions`, de propósito: quem chama este componente é o
  `AzuosCalendar`, não uma tela — é o mesmo contrato do template, onde ele entra no lugar do
  `Dropdown` da biblioteca de calendário. Props soltas: `options` (valor, rótulo e se está fora do
  limite), `value`, `ariaLabel`, `disabled` e o retorno `onChange` com o valor escolhido.
-->
<script lang="ts" module>
  export type AzuosCalendarDropdownOption = { value: number; label: string; disabled?: boolean };

  export type AzuosCalendarDropdownProps = {
    options: AzuosCalendarDropdownOption[];
    value: number;
    /** O nome da lista ("Mês", "Ano"); o botão é lido como "Mês: Março". */
    ariaLabel: string;
    disabled?: boolean;
    onChange: (value: number) => void;
  };

  const MONTH_NAME = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' });

  /**
   * O nome do mês na lista, por extenso e em português, com a primeira letra maiúscula
   * (`1` → "Janeiro"). Fixo em pt-BR: pelo idioma do navegador, um navegador em inglês mostrava
   * "Apr" no meio de uma tela em português.
   */
  export function calendarMonthName(month: number): string {
    const name = MONTH_NAME.format(new Date(Date.UTC(2026, month - 1, 1, 12)));

    return name.charAt(0).toUpperCase() + name.slice(1);
  }
</script>

<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';

  import { cn } from '$lib/utils/cn';

  let { options, value, ariaLabel, disabled = false, onChange }: AzuosCalendarDropdownProps =
    $props();

  const listId = `calendar-dropdown-${Math.random().toString(36).slice(2, 9)}`;
  let isOpen = $state(false);

  const selected = $derived(options.find((option) => option.value === value));

  /* As travas repetem o `disabled` do botão: quem dispara o clique por código passa por cima dele. */
  function toggle() {
    if (disabled) return;
    isOpen = !isOpen;
  }

  function choose(option: AzuosCalendarDropdownOption) {
    if (option.disabled) return;
    onChange(option.value);
    isOpen = false;
  }

  function closeWhenFocusLeaves(event: FocusEvent & { currentTarget: HTMLDivElement }) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) isOpen = false;
  }

  /* A opção que está valendo nasce no meio da lista: sem isso a lista de anos abriria em 1926. */
  function centerSelected(node: HTMLButtonElement, isSelected: boolean) {
    if (isSelected) node.scrollIntoView?.({ block: 'center' });
  }
</script>

<div class="relative inline-block" onfocusout={closeWhenFocusLeaves}>
  <button
    type="button"
    {disabled}
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    aria-controls={listId}
    aria-label={`${ariaLabel}: ${selected?.label ?? ''}`}
    onclick={toggle}
    class="control-sm rounded-control bg-muted text-foreground hover:bg-accent/60 focus-visible:ring-ring/50 inline-flex cursor-pointer items-center gap-1 text-sm font-medium transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {selected?.label}
    <ChevronDown class="text-muted-foreground size-3.5" aria-hidden="true" />
  </button>

  {#if isOpen}
    <div
      id={listId}
      role="listbox"
      aria-label={ariaLabel}
      class="rounded-box bg-popover ring-foreground/8 absolute top-full left-1/2 z-20 mt-1.5 flex max-h-56 w-max min-w-full -translate-x-1/2 flex-col gap-0.5 overflow-y-auto p-1 shadow-xl ring-1"
    >
      {#each options as option (option.value)}
        {@const isSelected = option.value === selected?.value}
        <button
          use:centerSelected={isSelected}
          type="button"
          role="option"
          aria-selected={isSelected}
          disabled={option.disabled}
          onclick={() => choose(option)}
          class={cn(
            'control-sm rounded-chip text-foreground hover:bg-accent shrink-0 cursor-pointer text-left text-sm whitespace-nowrap transition-colors outline-none',
            'focus-visible:bg-accent disabled:cursor-not-allowed disabled:opacity-40',
            isSelected && 'bg-primary text-primary-foreground hover:bg-primary font-semibold',
          )}
        >
          {option.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
