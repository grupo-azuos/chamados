<script lang="ts">
  import { page } from '$app/state';

  import Screen from './computer-detail-screen.svelte';

  /* A ficha da máquina, com endereço próprio (`/infra/computers/3`). A ficha mora em `computer-detail-screen.svelte`, que a Rastreabilidade também abre num diálogo. */
</script>

<Screen id={Number(page.params.id)} />
