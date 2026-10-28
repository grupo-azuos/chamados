<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import AzuosSupportNavbar from './azuos-support-navbar.svelte';

  const person = { name: 'Bia Costa', avatarUrl: null };
  const actions = { onToggleTheme: fn(), onSignOut: fn() };

  const { Story } = defineMeta({
    title: 'Features/Support/AzuosSupportNavbar',
    component: AzuosSupportNavbar,
  });
</script>

<!-- Na tela de abrir chamado. -->
<Story name="Default" args={{ data: { activeHref: '/support', person, theme: 'light' }, actions }} />

<!-- Na consulta, com o tema escuro (o botão oferece o claro). -->
<Story
  name="OnTicketsDark"
  args={{ data: { activeHref: '/support/tickets', person, theme: 'dark' }, actions }}
/>

<!-- No perfil: o cartão da pessoa fica marcado. -->
<Story name="OnProfile" args={{ data: { activeHref: '/support/profile', person, theme: 'light' }, actions }} />

<!-- Nome comprido: corta com reticências, sem empurrar os links. -->
<Story
  name="LongName"
  args={{
    data: {
      activeHref: '/support',
      person: { name: 'Maria Aparecida dos Santos Albuquerque Vasconcelos', avatarUrl: null },
      theme: 'light',
    },
    actions,
  }}
/>

<!-- Saindo: o botão de sair mostra que está trabalhando. -->
<Story
  name="SigningOut"
  args={{ data: { activeHref: '/support', person, theme: 'light' }, state: { isSigningOut: true }, actions }}
/>

<!-- A identidade ainda não chegou. -->
<Story name="WithoutPerson" args={{ data: { activeHref: '/support', person: null, theme: 'light' }, actions }} />
