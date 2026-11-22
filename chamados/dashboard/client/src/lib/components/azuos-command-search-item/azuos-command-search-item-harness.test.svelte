<script lang="ts">
  import CommandSearch from '$lib/components/azuos-command-search/azuos-command-search.svelte';
  import CommandSearchItem from './azuos-command-search-item.svelte';

  let { onSelect, isDisabled = false }: { onSelect: () => void; isDisabled?: boolean } = $props();
</script>

<CommandSearch data={{ term: '' }} actions={{ onTermChange: () => {} }}>
  <CommandSearchItem
    data={{ value: 'Tecnologia' }}
    ui={{ className: 'rounded-chip' }}
    state={{ isDisabled }}
    actions={{ onSelect }}
  >
    Tecnologia
  </CommandSearchItem>
</CommandSearch>
