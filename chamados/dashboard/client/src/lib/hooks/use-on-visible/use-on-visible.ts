import type { Action } from 'svelte/action';

/**
 * Avisa quando um elemento entra na tela. É o gatilho do scroll infinito.
 *
 * No Svelte é uma AÇÃO (`use:onVisible={...}`), e não um gancho que devolve `ref`: o elemento
 * chega pronto, e o `update` troca a configuração sem a tela precisar saber de observador.
 *
 * `rootMargin` de 400px faz o aviso chegar ANTES de o elemento aparecer: a página seguinte
 * começa a ser buscada enquanto ainda há conteúdo para rolar, e a lista não para.
 *
 * O observador é recriado quando `isEnabled` muda porque é assim que ele PARA: sem isso, a
 * última página continuaria pedindo mais a cada rolagem.
 */
export type OnVisibleOptions = {
  onVisible: () => void;
  isEnabled: boolean;
  rootMargin?: string;
};

export const onVisible: Action<HTMLElement, OnVisibleOptions> = (node, initial) => {
  let options = initial;
  let observer: IntersectionObserver | null = null;

  function connect() {
    observer?.disconnect();
    observer = null;
    if (!options.isEnabled) return;
    /* jsdom não implementa `IntersectionObserver` de verdade; sem a guarda, um ambiente sem ele
       quebraria por causa de um recurso que não é o que está sendo testado. */
    if (typeof IntersectionObserver === 'undefined') return;

    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) options.onVisible();
      },
      { rootMargin: options.rootMargin ?? '400px' },
    );
    observer.observe(node);
  }

  connect();

  return {
    update(next) {
      const mustReconnect =
        next.isEnabled !== options.isEnabled || next.rootMargin !== options.rootMargin;
      options = next;
      if (mustReconnect) connect();
    },
    destroy() {
      observer?.disconnect();
    },
  };
};
