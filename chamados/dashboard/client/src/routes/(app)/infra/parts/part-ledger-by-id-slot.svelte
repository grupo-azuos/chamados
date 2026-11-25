<script lang="ts" module>
  /** O extrato da peça a partir do número dela — o que a Rastreabilidade abre sobre o mapa. */
  export type PartLedgerByIdSlotProps = { id: number; onClose: () => void };
</script>

<script lang="ts">
  import ErrorState from '$lib/components/azuos-error-state/azuos-error-state.svelte';
  import ExpandableScreen from '$lib/components/azuos-expandable-screen/azuos-expandable-screen.svelte';
  import { usePartByIdModel } from '$lib/hooks/use-part-ledger/use-part-ledger.svelte';
  import PartLedgerSlot from './part-ledger-slot.svelte';

  let { id, onClose }: PartLedgerByIdSlotProps = $props();

  // svelte-ignore state_referenced_locally
  const part = usePartByIdModel(id);
</script>

{#if part.part}
  <PartLedgerSlot part={part.part} {onClose} />
{:else if part.error}
  <ExpandableScreen data={{ title: 'Peça' }} state={{ isOpen: true }} actions={{ onClose }}>
    <div class="p-6"><ErrorState data={{ message: part.error }} ui={{ variant: 'inline' }} /></div>
  </ExpandableScreen>
{/if}
