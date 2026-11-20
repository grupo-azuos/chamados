import { z } from 'zod';

/**
 * O QUE SAIU DE UM CHAMADO — e pode voltar.
 *
 * Nada que se tira de um chamado se apaga: o anexo, a máquina, a pessoa vinculada, o item do
 * estoque, o chamado relacionado e a área participante são ARQUIVADOS. O bloco "Removidos" da
 * ficha lista todos de uma vez, e cada linha tem o "Desfazer".
 */
export const TICKET_REMOVED_KINDS = [
  'attachment',
  'computer',
  'watcher',
  'stock_item',
  'relation',
  'area',
] as const;

export const ticketRemovedKindSchema = z.enum(TICKET_REMOVED_KINDS);

export type TicketRemovedKind = z.infer<typeof ticketRemovedKindSchema>;

/** O nome de cada tipo, como a linha do bloco "Removidos" o mostra. */
export const TICKET_REMOVED_KIND_LABELS: Record<TicketRemovedKind, string> = {
  attachment: 'Anexo',
  computer: 'Máquina',
  watcher: 'Pessoa',
  stock_item: 'Item do estoque',
  relation: 'Chamado relacionado',
  area: 'Área',
};

export const ticketRemovedItemSchema = z.object({
  kind: ticketRemovedKindSchema,
  /** O id da linha arquivada (não o da máquina, da pessoa ou do chamado). */
  id: z.number().int(),
  /** O que era — o nome do arquivo, da máquina, da pessoa, o protocolo, a área. */
  label: z.string(),
  archivedAt: z.iso.datetime(),
  /** Se quem está vendo pode desfazer — a tela esconde o botão de quem não pode. */
  canRestore: z.boolean(),
});

export type TicketRemovedItem = z.infer<typeof ticketRemovedItemSchema>;
