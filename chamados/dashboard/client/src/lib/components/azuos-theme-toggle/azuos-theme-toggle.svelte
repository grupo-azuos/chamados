<script lang="ts">
  import Moon from '@lucide/svelte/icons/moon';
  import Sun from '@lucide/svelte/icons/sun';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import { useThemeModel } from '$lib/theme/theme.svelte';

  /**
   * O botão de trocar entre claro e escuro — do mesmo jeito que o do agente
   * (`chamados/agent/svelte/src/lib/components/azuos-theme-toggle`): cuida do próprio tema,
   * sem precisar que a rota passe estado nenhum. Ícone de lua quando está escuro, sol quando
   * está claro — o ícone mostra o tema DE AGORA, não para onde o clique leva.
   */
  const theme = useThemeModel();

  const SIDEBAR_ICON = 'text-brand-yellow-400 hover:bg-sidebar-accent hover:text-brand-yellow-300';
</script>

<ActionButton
  data={{ label: theme.theme === 'dark' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro' }}
  ui={{
    variant: 'ghost',
    size: 'sm',
    icon: theme.theme === 'dark' ? Moon : Sun,
    isIconOnly: true,
    /* Mora na barra lateral azul: o amarelo da marca é o que aparece ali. */
    className: SIDEBAR_ICON,
  }}
  actions={{ onClick: theme.actions.onToggle }}
/>
