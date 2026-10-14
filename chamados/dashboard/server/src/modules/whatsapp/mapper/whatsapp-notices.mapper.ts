import {
  WHATSAPP_NOTICE_KINDS,
  type WhatsappNotice,
  type WhatsappNoticeKind,
} from '@template/shared/schemas/whatsapp-notice.schema';

import { type WhatsappMessageRow } from '../../../lib/db/schema/whatsapp-connections.schema';

/**
 * A linha da fila como a ficha do chamado a vê. O texto e o telefone NÃO saem daqui: a ficha
 * só precisa saber se o aviso saiu, e por que não.
 *
 * Nulo para o que não é aviso de chamado (resposta de conversa que, por acaso, citou o número).
 */
export function toWhatsappNotice(row: WhatsappMessageRow): WhatsappNotice | null {
  if (!isNoticeKind(row.kind)) return null;

  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    attempts: row.attempts,
    failureReason: row.failureReason,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
  };
}

function isNoticeKind(kind: string): kind is WhatsappNoticeKind {
  return (WHATSAPP_NOTICE_KINDS as readonly string[]).includes(kind);
}
