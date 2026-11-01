<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ThemeToggle from './azuos-theme-toggle.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosThemeToggle',
    component: ThemeToggle,
    parameters: { layout: 'padded' },
  });
</script>

<!-- Clique para alternar: o ícone mostra o tema de agora. -->
<Story name="Default" />
