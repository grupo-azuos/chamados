<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import AzuosSupportHeader from './azuos-support-header.svelte';

  const base = {
    title: 'Central de Chamados TI',
    subtitle: 'Abra e acompanhe as suas solicitações de suporte técnico.',
    profileHref: '/support/profile',
  };

  const { Story } = defineMeta({
    title: 'Features/Support/AzuosSupportHeader',
    component: AzuosSupportHeader,
  });
</script>

<!-- A pessoa sem foto: aparecem as iniciais. -->
<Story name="Default" args={{ data: { ...base, person: { name: 'Bia Costa', avatarUrl: null } } }} />

<!-- Nome comprido: corta com reticências, sem empurrar o título. -->
<Story
  name="LongName"
  args={{
    data: {
      ...base,
      person: { name: 'Maria Aparecida dos Santos Albuquerque Vasconcelos', avatarUrl: null },
    },
  }}
/>

<!-- Já no perfil: sem cartão da pessoa. -->
<Story
  name="OnProfile"
  args={{
    data: { ...base, title: 'Meu perfil', person: { name: 'Bia Costa', avatarUrl: null }, profileHref: null },
  }}
/>

<!-- A identidade ainda não chegou. -->
<Story name="WithoutPerson" args={{ data: { ...base, person: null } }} />
