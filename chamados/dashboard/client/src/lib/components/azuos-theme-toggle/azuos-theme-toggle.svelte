<!--
  @component
  O botão de trocar entre claro e escuro. Cuida do próprio tema (`lib/theme/theme.svelte.ts`), sem
  precisar que a rota passe estado nenhum — por isso pode ir em qualquer canto do menu sem a tela em
  volta saber que existe um tema.

  Ícone de lua quando está escuro, sol quando está claro: o ícone mostra o tema DE AGORA, não para
  onde o clique leva. É a mesma leitura de um interruptor — ele mostra o estado, não o destino.
-->
<script lang="ts">
  import Moon from '@lucide/svelte/icons/moon';
  import Sun from '@lucide/svelte/icons/sun';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import { useThemeModel } from '$lib/theme/theme.svelte';

  /* `sidebar`: o sol amarelo sobre o azul do menu; `surface` (o padrão): o azul da marca sobre a
     superfície. */
  let { ui }: { ui?: { variant?: 'sidebar' | 'surface' } } = $props();

  const theme = useThemeModel();
  const isDark = $derived(theme.theme === 'dark');
</script>

<ActionButton
  data={{ label: isDark ? 'Mudar para o tema claro' : 'Mudar para o tema escuro' }}
  ui={{
    variant: 'ghost',
    size: 'sm',
    icon: isDark ? Moon : Sun,
    isIconOnly: true,
    className:
      ui?.variant === 'sidebar'
        ? 'text-brand-yellow-400 hover:text-brand-yellow-300 hover:bg-sidebar-accent'
        : 'text-primary dark:text-info hover:text-primary hover:bg-primary/10',
  }}
  actions={{ onClick: theme.actions.onToggle }}
/>
