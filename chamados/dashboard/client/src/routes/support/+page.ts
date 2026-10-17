import { type SessionUser } from '@template/shared/schemas/user.schema';

import { authApi } from '$lib/api/auth.api';

/**
 * A Central de Chamados exige usuário autenticado (user, manager ou admin).
 * Qualquer usuário com conta no sistema acessa aqui para abrir e acompanhar seus chamados.
 */
export async function load(): Promise<{ user: SessionUser }> {
  const user = await authApi.me();

  return { user };
}
