<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Check from '@lucide/svelte/icons/check';

  import CommandSearch from '$lib/components/azuos-command-search/azuos-command-search.svelte';
  import CommandSearchItem from './azuos-command-search-item.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosCommandSearchItem',
    component: CommandSearchItem,
    parameters: { layout: 'padded' },
  });
</script>

<!-- A linha comum, a escolhida (com o visto) e a desabilitada, lado a lado na mesma lista. -->
<Story name="Default">
  {#snippet template()}
    <div class="ring-foreground/8 rounded-surface w-64 shadow-xl ring-1">
      <CommandSearch data={{ term: '' }} ui={{ className: 'rounded-surface bg-card' }} actions={{ onTermChange: () => {} }}>
        <CommandSearchItem data={{ value: 'Financeiro' }} ui={{ className: 'rounded-chip' }} actions={{ onSelect: () => {} }}>
          <Check class="size-4 shrink-0" aria-hidden="true" />
          Financeiro
        </CommandSearchItem>
        <CommandSearchItem data={{ value: 'Tecnologia' }} ui={{ className: 'rounded-chip' }} actions={{ onSelect: () => {} }}>
          <Check class="size-4 shrink-0 opacity-0" aria-hidden="true" />
          Tecnologia
        </CommandSearchItem>
        <CommandSearchItem
          data={{ value: 'Arquivado' }}
          ui={{ className: 'rounded-chip' }}
          state={{ isDisabled: true }}
          actions={{ onSelect: () => {} }}
        >
          <Check class="size-4 shrink-0 opacity-0" aria-hidden="true" />
          Arquivado
        </CommandSearchItem>
      </CommandSearch>
    </div>
  {/snippet}
</Story>
