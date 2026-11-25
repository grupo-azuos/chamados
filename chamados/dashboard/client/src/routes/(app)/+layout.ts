import { redirect } from '@sveltejs/kit';
import { type SessionUser } from '@template/shared/schemas/user.schema';

import { modulesOf } from '@template/shared/domain/module-access.util';

import { authApi } from '$lib/api/auth.api';
import { sidebarOpenFromCookie } from '$lib/utils/sidebar-state.util';

/**
 * A GUARDA de sessão: todo o painel interno mora dentro deste grupo de rota, e ninguém
 * chega em nenhuma tela dele sem sessão válida.
 *
 * `/api/v1/auth/me` é a mesma origem de verdade que o backend usa para tudo o mais — não existe
 * um segundo lugar guardando "está logado" que pudesse divergir dele.
 *
 * Quem não tem módulo nenhum (usuário sem permissão de Infra, Sistema ou Manutenção) é
 * redirecionado para a Central de Chamados (`/support`), onde pode abrir e acompanhar seus
 * chamados.
 *
 * Qualquer falha de autenticação (401) sobe em vez de mascarar com redirecionamento,
 * garantindo que a pessoa entre pelo login.
 */
export async function load(): Promise<{ user: SessionUser; sidebarOpen: boolean }> {
  const user = await loadUser();

  /* Quem não tem módulo nenhum só abre e acompanha chamado pelo /support e valida documentos.
     Todo o painel interno é de algum módulo, então a pessoa sem módulos vai direto para a Central. */
  if (modulesOf(user).length === 0) redirect(307, '/support');

  /* A barra aberta ou recolhida, como a pessoa deixou. Lida aqui, junto da casca, que é uma
     só para o painel inteiro — no navegador, não no servidor: a tela é um SPA estático. */
  return { user, sidebarOpen: sidebarOpenFromCookie(document.cookie) };
}

async function loadUser(): Promise<SessionUser> {
  return await authApi.me();
}
