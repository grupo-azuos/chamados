<script lang="ts">
  import Gauge from '@lucide/svelte/icons/gauge';
  import Sparkles from '@lucide/svelte/icons/sparkles';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import { useEffectsModel } from '$lib/hooks/use-effects/use-effects.svelte';

  /**
   * O botão de efeitos visuais: completos ou leves. Irmão do `ThemeToggle` e do mesmo jeito —
   * cuida da própria preferência (`lib/hooks/use-effects`), a tela só o coloca no menu.
   *
   * O sistema já escolhe sozinho pelo que a máquina aguenta; este botão é para quem quer
   * mandar: forçar o modo leve num PC que a detecção achou bom, ou o completo num que ela achou
   * fraco. Como no tema, o ícone mostra o modo DE AGORA, não para onde o clique leva.
   */
  const effects = useEffectsModel();

  let { ui }: { ui?: { variant?: 'sidebar' | 'surface' } } = $props();

  const SIDEBAR_ICON = 'text-brand-yellow-400 hover:bg-sidebar-accent hover:text-brand-yellow-300';
</script>

<ActionButton
  data={{
    label:
      effects.level === 'full'
        ? 'Efeitos visuais completos — mudar para o modo leve'
        : 'Efeitos visuais leves — mudar para o modo completo',
  }}
  ui={{
    variant: 'ghost',
    size: 'sm',
    icon: effects.level === 'full' ? Sparkles : Gauge,
    isIconOnly: true,
    /* Amarelo sobre a barra azul; cor primária sobre o cartão do perfil. */
    className: ui?.variant === 'surface' ? 'text-primary hover:bg-primary/10 hover:text-primary' : SIDEBAR_ICON,
  }}
  actions={{ onClick: effects.actions.onToggle }}
/>
