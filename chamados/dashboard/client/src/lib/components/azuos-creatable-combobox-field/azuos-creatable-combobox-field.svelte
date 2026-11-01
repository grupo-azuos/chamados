<script lang="ts" module>
  import { searchKey } from '$lib/utils/company-search.util';

  /**
   * Seletor com busca que também CADASTRA — o campo "Cidade", "Fornecedor".
   *
   * Por que não um `<select>`: a lista vem do banco e não cabe inteira na tela. Por que não um
   * `<input>` com sugestão: ele deixava "Goiania", "GOIÂNIA" e "Goiânia" entrarem como três itens.
   *
   * O fluxo é BUSCAR ANTES DE CADASTRAR: a pessoa digita, a lista mostra o que já existe, e a
   * opção "Cadastrar" só aparece quando nenhuma opção tem a MESMA chave (sem acento e sem caixa)
   * do que foi digitado. "goias" com "Goiás" na lista não oferece cadastro — oferece Goiás.
   *
   * O estado daqui é visual (aberto, termo, item destacado). Quem busca e quem grava é a tela, por
   * `actions.onSearch` e `actions.onCreate`.
   */
  export type AzuosCreatableComboboxFieldProps = {
    data: { value: string; options: string[] };
    ui?: {
      id?: string;
      ariaLabel?: string;
      placeholder?: string;
      searchPlaceholder?: string;
      /** Rótulo da opção que limpa o campo. Sem ele, o campo não oferece limpar. */
      clearLabel?: string;
      className?: string;
    };
    state?: { isLoading?: boolean; isCreating?: boolean; isDisabled?: boolean };
    actions: {
      onChange: (value: string) => void;
      onSearch: (term: string) => void;
      onCreate: (name: string) => void;
    };
  };

  export type ComboboxItem =
    | { kind: 'clear'; label: string }
    | { kind: 'option'; label: string }
    | { kind: 'create'; label: string };

  /** A lista que o teclado percorre, montada num lugar só para a seta e o clique concordarem. */
  export function buildComboboxItems(input: {
    term: string;
    options: string[];
    hasValue: boolean;
    clearLabel?: string;
    isLoading?: boolean;
  }): ComboboxItem[] {
    const items: ComboboxItem[] = [];
    const typed = input.term.trim().replace(/\s+/g, ' ');

    if (input.clearLabel && input.hasValue && !typed) items.push({ kind: 'clear', label: input.clearLabel });
    for (const option of input.options) items.push({ kind: 'option', label: option });

    /* Enquanto a busca não voltou, a lista é a da tecla anterior: oferecer "Cadastrar" nela
       convidaria a criar um item que o servidor ainda ia mostrar. */
    if (!typed || input.isLoading) return items;

    const typedKey = searchKey(typed);
    const exists = input.options.some((option) => searchKey(option) === typedKey);
    if (!exists) items.push({ kind: 'create', label: typed });

    return items;
  }

  /** A posição destacada depois de uma seta, ou `null` quando a tecla não é de navegação. */
  export function moveHighlight(key: string, current: number, length: number): number | null {
    if (key === 'ArrowDown') return Math.min(current + 1, length - 1);
    if (key === 'ArrowUp') return Math.max(current - 1, 0);

    return null;
  }
</script>

<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import Plus from '@lucide/svelte/icons/plus';
  import Search from '@lucide/svelte/icons/search';

  import * as Popover from '$lib/components/ui/popover';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions }: AzuosCreatableComboboxFieldProps = $props();

  const listId = `creatable-${Math.random().toString(36).slice(2, 9)}`;
  let isOpen = $state(false);
  let term = $state('');
  let activeIndex = $state(0);

  const items = $derived(
    buildComboboxItems({
      term,
      options: data.options,
      hasValue: !!data.value,
      clearLabel: ui?.clearLabel,
      isLoading: fieldState?.isLoading,
    }),
  );

  function changeOpen(open: boolean) {
    isOpen = open;
    if (!open) return;
    /* Abrir sempre começa do zero: o termo da última abertura não diz nada sobre o que a pessoa
       procura agora. */
    term = '';
    activeIndex = 0;
    actions.onSearch('');
  }

  function changeTerm(next: string) {
    term = next;
    activeIndex = 0;
    actions.onSearch(next);
  }

  function choose(item: ComboboxItem | undefined) {
    if (!item) return;
    if (item.kind === 'create') actions.onCreate(item.label);
    if (item.kind === 'option') actions.onChange(item.label);
    if (item.kind === 'clear') actions.onChange('');
    isOpen = false;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      /* Enter dentro do diálogo não pode enviar o formulário em volta. */
      event.preventDefault();
      choose(items[activeIndex]);
      return;
    }
    const next = moveHighlight(event.key, activeIndex, items.length);
    if (next === null) return;
    event.preventDefault();
    activeIndex = next;
  }
</script>

<Popover.Root bind:open={() => isOpen, changeOpen}>
  <Popover.Trigger
    id={ui?.id}
    type="button"
    role="combobox"
    aria-label={ui?.ariaLabel}
    aria-expanded={isOpen}
    aria-controls={listId}
    disabled={fieldState?.isDisabled}
    class={cn(
      'control-lg rounded-control border-input bg-muted text-foreground flex w-full items-center justify-between gap-2 border px-3 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none',
      'focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
      ui?.className,
    )}
  >
    <span class={cn('truncate', !data.value && 'text-muted-foreground')}>
      {data.value || ui?.placeholder}
    </span>
    {#if fieldState?.isCreating}
      <LoaderCircle aria-hidden="true" class="size-4 shrink-0 animate-spin opacity-50" />
    {:else}
      <ChevronDown aria-hidden="true" class="size-4 shrink-0 opacity-50" />
    {/if}
  </Popover.Trigger>
  <Popover.Content align="start" matchAnchorWidth class="min-w-56 gap-0 p-0">
    <div class="flex items-center gap-2 border-b px-3">
      <Search aria-hidden="true" class="text-muted-foreground size-3.5 shrink-0" />
      <!-- svelte-ignore a11y_autofocus -->
      <input
        autofocus
        value={term}
        oninput={(event) => changeTerm(event.currentTarget.value)}
        onkeydown={handleKeyDown}
        placeholder={ui?.searchPlaceholder}
        aria-label={ui?.searchPlaceholder ?? ui?.ariaLabel}
        aria-controls={listId}
        aria-activedescendant={items[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        class="control-lg rounded-control bg-muted placeholder:text-muted-foreground w-full px-2 text-sm outline-none"
      />
      {#if fieldState?.isLoading}
        <LoaderCircle aria-hidden="true" class="text-muted-foreground size-3.5 shrink-0 animate-spin" />
      {/if}
    </div>
    {#if items.length === 0}
      <p class="text-muted-foreground px-3 py-4 text-center text-xs">
        {fieldState?.isLoading ? 'Buscando…' : 'Digite para buscar ou cadastrar'}
      </p>
    {:else}
      <ul id={listId} role="listbox" class="max-h-60 overflow-y-auto p-1">
        {#each items as item, index (`${item.kind}-${item.label}`)}
          {@const isChosen = item.kind === 'option' && item.label === data.value}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <li
            id={`${listId}-${index}`}
            role="option"
            aria-selected={isChosen}
            onmousemove={() => (activeIndex = index)}
            onclick={() => choose(item)}
            class={cn(
              'rounded-chip flex min-h-10 cursor-default items-center gap-2 px-2 text-sm select-none',
              index === activeIndex && 'bg-accent text-accent-foreground',
              item.kind === 'create' && 'text-brand-blue-800 mt-1 border-t font-medium',
              item.kind === 'clear' && 'text-muted-foreground italic',
            )}
          >
            {#if item.kind === 'create'}
              <Plus aria-hidden="true" class="size-3.5 shrink-0" />
              <span class="truncate">Cadastrar “{item.label}”</span>
            {:else}
              <Check aria-hidden="true" class={cn('size-3.5 shrink-0', isChosen ? 'opacity-100' : 'opacity-0')} />
              <span class="truncate">{item.label}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </Popover.Content>
</Popover.Root>
