import { type SessionUser } from '@template/shared/schemas/user.schema';

import { authApi } from '$lib/api/auth.api';

/**
 * A conferência de ordem de serviço exige usuário autenticado.
 * Qualquer usuário com conta confere documentos emitidos pelo sistema.
 */
export async function load(): Promise<{ user: SessionUser }> {
  const user = await authApi.me();

  return { user };
}
