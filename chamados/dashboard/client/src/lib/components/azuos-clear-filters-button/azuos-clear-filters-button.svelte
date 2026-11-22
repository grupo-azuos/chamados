<!--
  @component
  "LIMPAR FILTROS" — o mesmo botão em toda tela que filtra.

  Só aparece quando há algum filtro ligado: sem filtro não há o que limpar, e um botão que não
  faz nada é ruído na barra. Limpar devolve a tela ao padrão dela.

  - `ui`: classe extra.
  - `state`: `hasFilter` — sem filtro ligado, o botão não aparece.
  - `actions`: `onClear`.
-->
<script lang="ts" module>
  export type AzuosClearFiltersButtonProps = {
    ui?: { className?: string };
    state: { hasFilter: boolean };
    actions: { onClear: () => void };
  };
</script>

<script lang="ts">
  import X from '@lucide/svelte/icons/x';

  import AzuosActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';

  let { ui, state: buttonState, actions }: AzuosClearFiltersButtonProps = $props();
</script>

{#if buttonState.hasFilter}
  <AzuosActionButton
    data={{ label: 'Limpar filtros' }}
    ui={{ variant: 'ghost', size: 'sm', icon: X, className: ui?.className }}
    actions={{ onClick: actions.onClear }}
  />
{/if}
