import { redirect } from '@sveltejs/kit';

import { TICKET_VIEW_PARAM } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';
import { contextPath } from '$lib/navigation/navigation';

/**
 * O KANBAN DEIXOU DE SER UMA TELA: virou um modo de ver a fila de Chamados, nas três áreas.
 *
 * O endereço antigo continua valendo — favorito, link num chamado, aba aberta — e cai na fila
 * de Sistema já no quadro. 308, e não 307: a mudança é para sempre.
 */
export function load(): never {
  redirect(308, `${contextPath('sistema', '/tickets')}?${TICKET_VIEW_PARAM}=kanban`);
}
