<script lang="ts" module>
  import { type Snippet } from 'svelte';

  /**
   * A TELA QUE SE EXPANDE — para o trabalho que não cabe num diálogo nem num combobox (montar o
   * painel, montar um filtro em árvore, ver um gráfico grande). Abre por cima de tudo, crescendo
   * a partir do centro, e ocupa a tela inteira; Esc e o X fecham. O mesmo desenho do paralegal.
   */
  export type AzuosExpandableScreenProps = {
    data: { title: string; description?: string };
    state: { isOpen: boolean };
    actions: { onClose: () => void };
    /** O rodapé fixo da tela (normalmente "Cancelar" e "Salvar"). */
    footer?: Snippet;
    children: Snippet;
  };

  /**
   * As telas abertas, da de baixo para a de cima. Uma tela cheia pode abrir sobre outra (montar o
   * painel → expandir um gráfico), e o Esc é de UMA só: a de cima. Se todas ouvissem o mesmo Esc,
   * fechariam juntas — e fechar a de montar o painel é "Restaurar", que joga o rascunho fora.
   */
  const OPEN_SCREENS: HTMLElement[] = [];

  /**
   * O Esc é desta tela quando ela é a de cima, ninguém já tratou a tecla, e o foco está nela (ou
   * solto na página). Foco num diálogo por cima (o editor de bloco) quer dizer que o Esc é dele.
   */
  export function isOwnEscape(event: KeyboardEvent, element: HTMLElement): boolean {
    if (event.key !== 'Escape' || event.defaultPrevented) return false;
    if (OPEN_SCREENS.at(-1) !== element) return false;
    const target = event.target;
    if (!(target instanceof Node) || target === document.body) return true;

    return element.contains(target);
  }

  /** A tela vai para o fim do `body`: por cima do menu do sistema, fora de qualquer `overflow`. */
  function portal(node: HTMLElement) {
    document.body.append(node);

    return { destroy: () => node.remove() };
  }
</script>

<script lang="ts">
  import X from '@lucide/svelte/icons/x';
  import gsap from 'gsap';

  import AzuosActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import { prefersReducedMotion } from '$lib/motion/motion';

  let { data, state: screenState, actions, footer, children }: AzuosExpandableScreenProps = $props();

  /* SÓ O SIM/NÃO, e não o objeto `state`: quem usa a tela passa um objeto novo a cada atualização
     dela (`state={{ isOpen }}`), e os efeitos abaixo, presos ao objeto, rodavam de novo a cada vez —
     a abertura animava outra vez (a tela piscava) e o foco voltava para ela, fechando o diálogo
     que acabara de abrir por cima. Com o valor derivado, eles só rodam quando abre ou fecha. */
  const isOpen = $derived(screenState.isOpen);

  /* FECHAR ANIMADO: quando `isOpen` vira falso, a tela continua montada o tempo de encolher de
     volta (o contrário da abertura) e só então sai. Quem pediu menos movimento vê fechar na hora. */
  let isMounted = $state(false);
  let panel = $state<HTMLDivElement | null>(null);

  const CLOSED_CLIP = 'inset(18% 22% 18% 22% round 24px)';

  $effect(() => {
    if (isOpen) {
      isMounted = true;
      return;
    }
    if (!isMounted) return;
    if (!panel || prefersReducedMotion()) {
      isMounted = false;
      return;
    }
    const tween = gsap.to(panel, {
      clipPath: CLOSED_CLIP,
      opacity: 0,
      duration: 0.24,
      ease: 'power2.in',
      onComplete: () => (isMounted = false),
    });

    return () => tween.kill();
  });

  /* Abrir: cresce do centro até a tela inteira; o foco vai para a tela, e o Esc passa a ser dela. */
  $effect(() => {
    const element = panel;
    if (!isOpen || !element) return;
    if (!prefersReducedMotion()) {
      gsap.fromTo(
        element,
        { clipPath: CLOSED_CLIP, opacity: 0.4 },
        {
          clipPath: 'inset(0% 0% 0% 0% round 0px)',
          opacity: 1,
          duration: 0.32,
          ease: 'power3.out',
          clearProps: 'clipPath,opacity',
        },
      );
    }
    OPEN_SCREENS.push(element);
    element.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (!isOwnEscape(event, element)) return;
      event.preventDefault();
      actions.onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      OPEN_SCREENS.splice(OPEN_SCREENS.indexOf(element), 1);
    };
  });
</script>

{#if isMounted}
  <div
    use:portal
    bind:this={panel}
    role="dialog"
    aria-modal="true"
    aria-label={data.title}
    tabindex="-1"
    class="bg-background fixed inset-0 z-50 flex flex-col outline-none"
  >
    <header class="border-border flex items-start justify-between gap-4 border-b px-6 py-4">
      <div class="min-w-0">
        <h2 class="text-ink-900 text-xl font-bold">{data.title}</h2>
        {#if data.description}
          <p class="text-ink-500 mt-0.5 text-sm">{data.description}</p>
        {/if}
      </div>
      <AzuosActionButton
        data={{ label: 'Fechar' }}
        ui={{ variant: 'ghost', icon: X, isIconOnly: true }}
        actions={{ onClick: actions.onClose }}
      />
    </header>
    <div class="min-h-0 flex-1 overflow-y-auto">{@render children()}</div>
    {#if footer}
      <footer class="border-border bg-card flex justify-end gap-2 border-t px-6 py-3">
        {@render footer()}
      </footer>
    {/if}
  </div>
{/if}
