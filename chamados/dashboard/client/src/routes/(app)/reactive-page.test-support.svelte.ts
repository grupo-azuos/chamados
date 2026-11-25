import { SvelteURL } from 'svelte/reactivity';

/**
 * O `page` do SvelteKit, REATIVO, para os testes que navegam.
 *
 * O `page` de `tests/app-mock` é um objeto comum: trocar o endereço nele não avisa ninguém. Para
 * provar o que acontece ENTRE uma tela e outra (a casca fica, só o conteúdo muda), o endereço
 * precisa ser `$state`, como no SvelteKit de verdade.
 */
export const page = $state({
  url: new SvelteURL('http://localhost:5173/'),
  params: {} as Record<string, string>,
  route: { id: '/' },
  status: 200,
  error: null,
  data: {} as Record<string, unknown>,
  form: undefined,
});

/** Abre outra tela, como um clique num link do menu. */
export function navigateTo(pathname: string): void {
  page.url = new SvelteURL(`http://localhost:5173${pathname}`);
}
