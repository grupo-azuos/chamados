<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import CommandSearch from './azuos-command-search.svelte';
  import CommandSearchItem from '$lib/components/azuos-command-search-item/azuos-command-search-item.svelte';

  const options = ['Financeiro', 'Recursos Humanos', 'Tecnologia', 'Comercial', 'Jurídico'];

  const { Story } = defineMeta({
    title: 'Components/AzuosCommandSearch',
    component: CommandSearch,
    parameters: { layout: 'padded' },
  });
</script>

<script lang="ts">
  let term = $state('');
</script>

<!-- A busca reta do template, com a lista filtrando enquanto se digita. -->
<Story name="Default">
  {#snippet template()}
    <div class="ring-foreground/8 rounded-surface w-64 shadow-xl ring-1">
      <CommandSearch data={{ term }} ui={{ className: 'rounded-surface bg-card' }} actions={{ onTermChange: (next) => (term = next) }}>
        {#each options as option (option)}
          <CommandSearchItem data={{ value: option }} ui={{ className: 'rounded-chip' }} actions={{ onSelect: () => {} }}>
            {option}
          </CommandSearchItem>
        {/each}
      </CommandSearch>
    </div>
  {/snippet}
</Story>

<!-- Caso limite: lista vazia, só a mensagem de "nada encontrado". -->
<Story name="Empty">
  {#snippet template()}
    <div class="ring-foreground/8 rounded-surface w-64 shadow-xl ring-1">
      <CommandSearch
        data={{ term: '' }}
        ui={{ emptyLabel: 'Ninguém com esse nome', className: 'rounded-surface bg-card' }}
        actions={{ onTermChange: () => {} }}
      />
    </div>
  {/snippet}
</Story>
