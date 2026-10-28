import { redirect } from '@sveltejs/kit';
import { TICKET_ACCESS_PARAM } from '@template/shared/domain/ticket-invite.util';

/**
 * O link de consulta das mensagens de WhatsApp é `/support?ticket=…` — e já foi enviado para
 * muita gente. A consulta agora tem tela própria; quem chega pelo link antigo é levado para
 * ela com o mesmo token, em vez de cair no formulário de abrir chamado.
 */
export function load({ url }: { url: URL }): void {
  const token = url.searchParams.get(TICKET_ACCESS_PARAM);
  if (!token) return;

  redirect(307, `/support/tickets?${TICKET_ACCESS_PARAM}=${encodeURIComponent(token)}`);
}
