import { type SessionUser } from '@template/shared/schemas/user.schema';

import { authApi } from '$lib/api/auth.api';

/**
 * A Central de Chamados exige usuário autenticado (user, manager ou admin).
 * Qualquer usuário com conta no sistema acessa aqui para abrir e acompanhar seus chamados.
 *
 * Mora no layout, e não na página, porque a Central tem duas telas — a de chamados e o perfil
 * (`/support/profile`) — e as duas precisam da mesma pessoa: buscá-la em cada uma seria pedir
 * duas vezes a mesma identidade ao trocar de tela.
 */
export async function load(): Promise<{ user: SessionUser }> {
  const user = await authApi.me();

  return { user };
}
