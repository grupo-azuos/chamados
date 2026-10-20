import { type AuthConfig } from '@template/shared/schemas/auth.schema';
import { type SessionUser } from '@template/shared/schemas/user.schema';

import { apiRequest } from './http-client';

/**
 * Perguntas que a tela faz à NOSSA API sobre identidade: "quem sou eu aqui?" e onde fica a
 * conta da pessoa no admin-console.
 *
 * Entrar e sair acontecem no admin-console, pelo proxy. O que só a nossa API sabe é o que a
 * pessoa pode AQUI — o papel e os módulos dela —, e é por isso que a tela pergunta aqui.
 */
export const authApi = {
  /** Quem está logado agora — ou lança 401 se ninguém estiver. */
  me: () => apiRequest<SessionUser>('/auth/me'),
  /** O endereço da conta da pessoa no admin-console (trocar senha, foto, sair). */
  config: () => apiRequest<AuthConfig>('/auth/config'),
  /** A API encaminha a revogação ao admin-console e devolve os cookies que ele apagou. */
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST', body: {} }),
};
