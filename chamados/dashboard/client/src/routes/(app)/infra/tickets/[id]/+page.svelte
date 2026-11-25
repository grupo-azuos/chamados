<script lang="ts">
  import { page } from '$app/state';

  import Screen from './ticket-detail-screen.svelte';

  /* A ficha do chamado, com endereço próprio (`/infra/tickets/7`). A ficha mora em `ticket-detail-screen.svelte`, que a Rastreabilidade também abre num diálogo. */
</script>

<Screen id={Number(page.params.id)} />
