<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';

  import {
    useSoftwareProjectFormModel,
    type SoftwareProjectFormModel,
  } from './use-software-project-form.svelte';

  /** Mesma razão do apoio da lista: o model precisa de um componente para existir. */
  let {
    project = null,
    onSaved = () => {},
    onReady,
  }: {
    project?: SoftwareProject | null;
    onSaved?: () => void;
    onReady: (model: SoftwareProjectFormModel) => void;
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useSoftwareProjectFormModel({ project, onSaved }));
</script>
