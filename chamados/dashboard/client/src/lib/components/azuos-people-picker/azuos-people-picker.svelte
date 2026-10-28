<script lang="ts" module>
  /**
   * SELETOR DE VÁRIAS PESSOAS — busca no balão, marca quantas quiser, as escolhidas ficam como
   * fichas embaixo (com o "x" para tirar).
   *
   * Nasceu para as PESSOAS VINCULADAS de um chamado (a "OS com envolvidos" do Tasy), que se
   * escolhem na abertura, na Central e no painel — por isso é genérico. É o par de várias
   * escolhas do `AzuosOptionPicker`: o mesmo gatilho de 40px, o mesmo balão com busca.
   */
  export type PeoplePickerOption = { id: string; name: string };

  export type AzuosPeoplePickerProps = {
    data: { selectedIds: string[]; options: PeoplePickerOption[] };
    ui?: { ariaLabel?: string; placeholder?: string; emptyLabel?: string; className?: string };
    state?: { isDisabled?: boolean; isLoading?: boolean; error?: string | null };
    actions: { onChange: (ids: string[]) => void };
  };

  /** "Ana", "Ana e Bia", "Ana e mais 2" — o texto do gatilho, que não pode crescer sem fim. */
  export function summaryOf(selected: readonly PeoplePickerOption[], placeholder: string): string {
    const [first, second] = selected;
    if (!first) return placeholder;
    if (!second) return first.name;
    if (selected.length === 2) return `${first.name} e ${second.name}`;

    return `${first.name} e mais ${selected.length - 1}`;
  }
</script>

<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import SearchIcon from '@lucide/svelte/icons/search';
  import XIcon from '@lucide/svelte/icons/x';

  import PersonAvatar from '$lib/components/azuos-person-avatar/azuos-person-avatar.svelte';
  import PopoverContent from '$lib/components/azuos-search-popover-content/azuos-search-popover-content.svelte';
  import { Popover, PopoverTrigger } from '$lib/components/ui/popover';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions }: AzuosPeoplePickerProps = $props();

  let isOpen = $state(false);
  let query = $state('');
  const fieldId = $props.id();
  const errorId = `${fieldId}-error`;

  /* A ficha mostra quem foi escolhido mesmo que a pessoa já não esteja nas opções (saiu do
     admin-console): some só quando alguém a tira. */
  const selected = $derived(
    data.selectedIds.map(
      (id) => data.options.find((option) => option.id === id) ?? { id, name: 'Pessoa removida' },
    ),
  );
  const filtered = $derived(
    query.trim()
      ? data.options.filter((option) =>
          option.name.toLowerCase().includes(query.trim().toLowerCase()),
        )
      : data.options,
  );

  function toggle(id: string): void {
    actions.onChange(
      data.selectedIds.includes(id)
        ? data.selectedIds.filter((selectedId) => selectedId !== id)
        : [...data.selectedIds, id],
    );
  }
</script>

<div class={cn('flex min-w-0 flex-col gap-2', ui?.className)}>
  <Popover bind:open={isOpen}>
    <PopoverTrigger
      disabled={fieldState?.isDisabled}
      aria-label={ui?.ariaLabel}
      aria-invalid={Boolean(fieldState?.error)}
      aria-describedby={fieldState?.error ? errorId : undefined}
      class="control-lg rounded-control border-border/70 bg-card text-foreground hover:bg-muted/40 inline-flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span class={cn('truncate', selected.length === 0 && 'text-muted-foreground font-normal')}>
        {summaryOf(selected, ui?.placeholder ?? 'Escolha as pessoas')}
      </span>
      <ChevronDownIcon class="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
    </PopoverTrigger>

    <PopoverContent
      class="w-auto min-w-(--bits-popover-anchor-width) max-w-[min(26rem,calc(100vw-2rem))] p-0"
      align="start"
    >
      <div class="border-border/70 relative shrink-0 border-b p-2">
        <SearchIcon
          class="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          type="text"
          bind:value={query}
          placeholder="Buscar pelo nome…"
          aria-label="Buscar pessoas"
          class="control-sm rounded-control border-border/60 bg-muted/30 text-foreground w-full border pr-2 pl-7 text-xs outline-none"
        />
      </div>
      <div class="max-h-80 min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain p-1" role="listbox" aria-multiselectable="true">
        {#if fieldState?.isLoading}
          <p class="text-muted-foreground px-2.5 py-3 text-center text-xs">Carregando pessoas…</p>
        {:else}
          {#each filtered as option (option.id)}
            {@const isSelected = data.selectedIds.includes(option.id)}
            <button
              type="button"
              role="option"
              aria-selected={isSelected}
              onclick={() => toggle(option.id)}
              class={cn(
                'rounded-chip flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                isSelected ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground hover:bg-muted/60',
              )}
            >
              <PersonAvatar name={option.name} />
              <span class="min-w-0 flex-1 break-words">{option.name}</span>
              {#if isSelected}
                <CheckIcon class="size-3.5 shrink-0" aria-hidden="true" />
              {/if}
            </button>
          {:else}
            <p class="text-muted-foreground px-2.5 py-3 text-center text-xs">Ninguém encontrado.</p>
          {/each}
        {/if}
      </div>
    </PopoverContent>
  </Popover>

  {#if selected.length > 0}
    <ul class="flex flex-wrap gap-1.5" aria-label="Pessoas escolhidas">
      {#each selected as person (person.id)}
        <li class="rounded-chip bg-muted text-foreground flex items-center gap-1.5 py-1 pr-1 pl-1.5 text-xs font-medium">
          <PersonAvatar name={person.name} />
          <span class="max-w-48 truncate">{person.name}</span>
          <button
            type="button"
            disabled={fieldState?.isDisabled}
            onclick={() => toggle(person.id)}
            aria-label={`Tirar ${person.name}`}
            class="rounded-chip text-muted-foreground hover:bg-background hover:text-foreground cursor-pointer p-0.5"
          >
            <XIcon class="size-3" aria-hidden="true" />
          </button>
        </li>
      {/each}
    </ul>
  {:else if ui?.emptyLabel}
    <p class="text-muted-foreground text-xs">{ui.emptyLabel}</p>
  {/if}

  {#if fieldState?.error}
    <p id={errorId} role="alert" class="text-destructive text-xs">{fieldState.error}</p>
  {/if}
</div>
