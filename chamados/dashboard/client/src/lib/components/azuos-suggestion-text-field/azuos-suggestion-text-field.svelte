<script lang="ts" module>
  /**
   * Um campo de texto com a lista de opções cadastradas embaixo — Departamento, Cargo, Fornecedor.
   *
   * Por que não `<datalist>`: a lista nativa só aparece DEPOIS de digitar, e a pessoa nunca via o
   * que já estava cadastrado. Aqui a lista inteira abre ao focar o campo e vai filtrando conforme
   * se digita.
   *
   * O campo aceita um valor que NÃO está na lista, de propósito: travar obrigaria a pessoa a sair
   * do formulário para cadastrar o item e voltar, perdendo o que já tinha preenchido.
   *
   * Teclado: seta para baixo/cima percorre, Enter escolhe, Esc fecha. O estado de aberto e de
   * opção ativa é puramente visual.
   */
  export type AzuosSuggestionTextFieldProps = {
    data: {
      label: string;
      name: string;
      value: string;
      options: string[];
      placeholder?: string;
      /** O que dizer quando não há NADA cadastrado — o próximo passo, não só "vazio". */
      emptyMessage?: string;
    };
    ui?: { className?: string };
    state?: { error?: string | null; isRequired?: boolean; isDisabled?: boolean; isLoading?: boolean };
    actions: { onChange: (value: string) => void; onBlur?: () => void };
  };

  export function comparable(value: string): string {
    return value.trim().toLocaleLowerCase('pt-BR');
  }

  export function filterOptions(options: string[], query: string): string[] {
    const term = comparable(query);
    if (!term) return options;

    return options.filter((option) => comparable(option).includes(term));
  }

  export function nextIndex(current: number, count: number, step: 1 | -1): number {
    if (current === -1) return step > 0 ? 0 : count - 1;

    return (current + step + count) % count;
  }

  export function emptyMessageOf(
    data: AzuosSuggestionTextFieldProps['data'],
    state: AzuosSuggestionTextFieldProps['state'],
  ): string {
    if (state?.isLoading) return 'Carregando opções…';
    if (data.options.length > 0) return 'Nenhuma opção com esse texto. O que foi digitado vale assim mesmo.';

    return data.emptyMessage ?? 'Nada cadastrado ainda.';
  }
</script>

<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';

  import { FIELD_CONTROL_CLASS } from '$lib/components/azuos-rich-text-field/azuos-rich-text-field.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions }: AzuosSuggestionTextFieldProps = $props();

  const inputId = `suggestion-${Math.random().toString(36).slice(2, 9)}`;
  const listId = `${inputId}-list`;
  const errorId = `${inputId}-error`;

  let input = $state<HTMLInputElement | null>(null);
  let isOpen = $state(false);
  /* O filtro só vale depois que a pessoa digita: ao focar, a lista mostra TUDO. */
  let query = $state('');
  let activeIndex = $state(-1);

  const error = $derived(fieldState?.error ?? null);
  const visible = $derived(filterOptions(data.options, query));
  const selectedKey = $derived(comparable(data.value));

  function open(nextQuery = '') {
    query = nextQuery;
    activeIndex = -1;
    isOpen = true;
  }

  function pick(value: string) {
    actions.onChange(value);
    isOpen = false;
  }

  function moveWithArrow(event: KeyboardEvent) {
    event.preventDefault();
    if (visible.length === 0) return;
    isOpen = true;
    activeIndex = nextIndex(activeIndex, visible.length, event.key === 'ArrowDown' ? 1 : -1);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      moveWithArrow(event);
      return;
    }
    /* Enter só escolhe quando há opção ativa: sem ela, o Enter segue para o formulário. */
    if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
      event.preventDefault();
      pick(visible[activeIndex] ?? data.value);
      return;
    }
    if (event.key === 'Escape' && isOpen) {
      event.stopPropagation();
      isOpen = false;
    }
  }

  /* `mousedown` com `preventDefault`: o foco fica no campo, e o `blur` não fecha a lista no mesmo
     instante em que o clique tenta abri-la. */
  function toggleFromButton(event: MouseEvent) {
    event.preventDefault();
    if (isOpen) {
      isOpen = false;
      return;
    }
    open();
    input?.focus();
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
    <input
      bind:this={input}
      id={inputId}
      name={data.name}
      value={data.value}
      placeholder={data.placeholder}
      autocomplete="off"
      disabled={fieldState?.isDisabled}
      required={fieldState?.isRequired}
      role="combobox"
      aria-expanded={isOpen}
      aria-controls={listId}
      aria-autocomplete="list"
      aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      onfocus={() => open()}
      oninput={(event) => {
        actions.onChange(event.currentTarget.value);
        open(event.currentTarget.value);
      }}
      onblur={() => {
        isOpen = false;
        actions.onBlur?.();
      }}
      onkeydown={handleKeyDown}
      class={cn(
        FIELD_CONTROL_CLASS,
        'pr-10',
        'placeholder:text-ink-500 disabled:cursor-not-allowed disabled:opacity-60',
        error ? 'border-border bg-destructive-soft' : 'border-input',
      )}
    />
    <button
      type="button"
      tabindex={-1}
      aria-label={`Ver as opções de ${data.label}`}
      disabled={fieldState?.isDisabled}
      onmousedown={toggleFromButton}
      class="text-ink-500 hover:text-ink-700 absolute inset-y-0 right-0 flex w-10 items-center justify-center"
    >
      <ChevronDown class="size-4" aria-hidden="true" />
    </button>
    {#if isOpen}
      <div
        id={listId}
        role="listbox"
        class="border-border bg-card rounded-box absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto border p-1 shadow-xl"
      >
        {#if visible.length === 0}
          <p class="text-ink-500 px-2 py-2 text-sm">{emptyMessageOf(data, fieldState)}</p>
        {:else}
          {#each visible as option, index (option)}
            <!-- `mousedown`, e não `click`: o `blur` do campo dispara antes do `click` e fecharia a
                 lista antes da escolha chegar. -->
            <div
              id={`${listId}-${index}`}
              role="option"
              tabindex={-1}
              aria-selected={comparable(option) === selectedKey}
              onmousedown={(event) => {
                event.preventDefault();
                pick(option);
              }}
              class={cn(
                'text-ink-900 rounded-chip flex min-h-10 cursor-pointer items-center px-2 text-sm break-words',
                index === activeIndex && 'bg-accent',
                comparable(option) === selectedKey && 'font-semibold',
              )}
            >
              {option}
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
  {#if error}
    <p id={errorId} role="alert" class="text-destructive text-xs font-medium">{error}</p>
  {/if}
</div>
