<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import MyProfileView from './azuos-my-profile-view.svelte';

  const person = {
    name: 'Ana Souza',
    email: 'ana.souza@grupoazuos.com.br',
    roleLabel: 'Super Admin',
    avatarUrl: null,
    jobTitle: 'Analista de TI',
    department: 'Tecnologia',
    phone: '(11) 91234-5678',
    birthDateLabel: '25/03/1990',
    bio: 'Cuido da infraestrutura do grupo.',
    systems: [
      { name: 'Paralegal', url: 'https://paralegal.grupoazuos.com.br', roleLabel: 'Gestor' },
      { name: 'Chamados', url: 'https://chamados.grupoazuos.com.br', roleLabel: 'Administrador' },
    ],
  };

  const { Story } = defineMeta({
    title: 'Navegação e estrutura/AzuosMyProfileView',
    component: MyProfileView,
    args: {
      data: { person, accountUrl: 'https://admin-console.grupoazuos.com.br/profile', theme: 'light' },
      actions: { onToggleTheme: fn(), onRetry: fn() },
    },
  });
</script>

<Story name="Default" />
<Story name="Loading" args={{ state: { isLoading: true } }} />
<Story
  name="LoadError"
  args={{ data: { person: null, accountUrl: null, theme: 'light' }, state: { error: 'Não consegui carregar seu perfil.' } }}
/>
