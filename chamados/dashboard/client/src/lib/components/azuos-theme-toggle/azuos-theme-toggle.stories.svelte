<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ThemeToggle from './azuos-theme-toggle.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosThemeToggle',
    component: ThemeToggle,
  });
</script>

<Story name="Default" />

<!-- A variante de contraste para superfícies azuis continua disponível. -->
<Story name="InSidebarFooter">
  <div class="bg-sidebar text-sidebar-foreground flex w-56 items-center justify-between rounded-box p-2">
    <span class="text-xs font-medium opacity-70">Tema</span>
    <ThemeToggle />
  </div>
</Story>

<Story name="OnSurface" args={{ ui: { variant: 'surface' } }} />
