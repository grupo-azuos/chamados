<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ModuleAccessCard from './azuos-module-access-card.svelte';

  const { Story } = defineMeta({
    title: 'Features/Profile/AzuosModuleAccessCard',
    component: ModuleAccessCard,
    args: { data: { role: 'user', roles: { infra: 'admin', manutencao: 'user' } } },
  });
</script>

<Story name="Default" />
<Story name="SuperAdmin" args={{ data: { role: 'superadmin' } }} />
