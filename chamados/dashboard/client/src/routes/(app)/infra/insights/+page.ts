import { redirect } from '@sveltejs/kit';

/**
 * A tela de Inteligência saiu: o que importava nela era "quem precisa de upgrade", e isso agora
 * é um aviso no próprio Inventário, com filtro. O endereço antigo (favorito, link no chat) leva
 * direto para o Inventário já filtrado, em vez de cair numa página que não existe.
 */
export function load(): never {
  redirect(307, '/infra/computers?upgrade=any');
}
