<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import {
    useDepartmentOptionsModel,
    type DepartmentOptionsModel,
  } from './use-department-options.svelte';

  /* View-model com consulta só existe dentro de um componente: daqui vêm o QueryClient e o
     ciclo de vida da busca. */
  let { onReady }: { onReady: (model: DepartmentOptionsModel) => void } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  onReady(useDepartmentOptionsModel());
</script>
