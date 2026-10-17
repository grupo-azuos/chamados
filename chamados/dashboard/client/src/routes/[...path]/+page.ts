import { error } from '@sveltejs/kit';

import { authApi } from '$lib/api/auth.api';

/**
 * O ENDEREÇO QUE NÃO EXISTE — é aqui que cai tudo o que nenhuma outra rota atende.
 *
 * Exige usuário autenticado: se a sessão for inválida (401), a falha sobe para o login.
 * Com sessão válida, responde 404 para indicar que o endereço não existe.
 */
export async function load(): Promise<never> {
  await authApi.me();

  error(404, 'Not Found');
}
