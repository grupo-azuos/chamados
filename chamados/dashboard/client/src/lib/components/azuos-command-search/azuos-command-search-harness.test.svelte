<script lang="ts">
  import CommandSearch from './azuos-command-search.svelte';
  import CommandSearchItem from '$lib/components/azuos-command-search-item/azuos-command-search-item.svelte';

  let {
    options = [],
    emptyLabel,
    onSelect = () => {},
    onTermChange,
  }: {
    options?: string[];
    emptyLabel?: string;
    onSelect?: (option: string) => void;
    onTermChange?: (term: string) => void;
  } = $props();

  let term = $state('');
</script>

<CommandSearch
  data={{ term }}
  ui={{ emptyLabel, placeholder: 'Buscar departamento' }}
  actions={{
    onTermChange: (next) => {
      term = next;
      onTermChange?.(next);
    },
  }}
>
  {#each options as option (option)}
    <CommandSearchItem data={{ value: option }} actions={{ onSelect: () => onSelect(option) }}>
      {option}
    </CommandSearchItem>
  {/each}
</CommandSearch>
