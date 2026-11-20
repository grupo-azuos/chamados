import { maintenanceTypeLabel } from '@template/shared/domain/maintenance.util';
import { movementTypeLabel } from '@template/shared/domain/part-catalog.util';
import { roleContextLabel } from '@template/shared/domain/role-context.util';
import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';
import { type InternalRole } from '@template/shared/schemas/internal-role.schema';
import { type MaintenanceQuote } from '@template/shared/schemas/maintenance-quote.schema';
import { type Maintenance, type MaintenanceSchedule } from '@template/shared/schemas/maintenance.schema';
import { type PartMovement } from '@template/shared/schemas/part.schema';
import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
import { type SoftwareScheduleEvent } from '@template/shared/schemas/software-schedule.schema';
import {
  TICKET_REMOVED_KIND_LABELS,
  type TicketRemovedItem,
} from '@template/shared/schemas/ticket-removed.schema';

import { type AzuosArchivedItem } from '$lib/components/azuos-archived-list/azuos-archived-list.svelte';
import { formatDay } from '$lib/utils/format-date';

/**
 * COMO CADA ARQUIVADO VIRA LINHA DO BLOCO "REMOVIDOS": o nome que a pessoa reconhece, o tipo
 * quando ajuda e a data em que saiu.
 *
 * O "Desfazer" aparece para todos os da lista: quem decide se a pessoa pode desfazer é o
 * servidor, com a mesma regra de quem pode excluir — e a recusa chega à tela com o motivo. A
 * ficha do chamado é a exceção: lá o servidor já diz, linha a linha, quem pode (`canRestore`).
 */

/** A data do arquivamento; um registro sem ela não chega aqui (a lista pede só arquivados). */
function archivedAtOf(row: { archive?: { archivedAt: string } | null }): string {
  return row.archive?.archivedAt ?? '';
}

function line(key: number | string, label: string, archivedAt: string, kind?: string): AzuosArchivedItem {
  return { key: String(key), label, kind, archivedAt, canRestore: true };
}

export function archivedMaintenanceItem(maintenance: Maintenance): AzuosArchivedItem {
  const machine =
    maintenance.computerDisplayName ?? maintenance.computerName ?? maintenance.otherMachine ?? '(Sem máquina)';

  return line(maintenance.id, machine, archivedAtOf(maintenance), maintenanceTypeLabel(maintenance.type));
}

export function archivedScheduleItem(schedule: MaintenanceSchedule): AzuosArchivedItem {
  const machine = schedule.computerDisplayName ?? schedule.computerName;

  return line(schedule.id, `${machine} — ${formatDay(schedule.scheduledFor)}`, archivedAtOf(schedule));
}

export function archivedInventoryItem(item: InventoryItem): AzuosArchivedItem {
  return line(item.id, item.code ? `${item.name} (${item.code})` : item.name, archivedAtOf(item));
}

export function archivedQuoteItem(quote: MaintenanceQuote): AzuosArchivedItem {
  return line(quote.id, `${quote.supplier} — ${quote.description}`, archivedAtOf(quote));
}

export function archivedMovementItem(movement: PartMovement): AzuosArchivedItem {
  return line(
    movement.id,
    `${movement.quantity} × ${movement.partName}`,
    archivedAtOf(movement),
    movementTypeLabel(movement.type),
  );
}

export function archivedProjectItem(project: SoftwareProject): AzuosArchivedItem {
  return line(project.id, project.name, archivedAtOf(project));
}

export function archivedScheduleEventItem(event: SoftwareScheduleEvent): AzuosArchivedItem {
  return line(event.id, `${event.title} — ${formatDay(event.date)}`, archivedAtOf(event));
}

export function archivedRoleItem(role: InternalRole): AzuosArchivedItem {
  return line(role.id, role.userEmail ?? role.userId, archivedAtOf(role), roleContextLabel(role.context));
}

/** A linha do chamado já vem pronta do servidor, com quem pode desfazer. */
export function ticketRemovedItem(item: TicketRemovedItem): AzuosArchivedItem {
  return {
    key: ticketRemovedKey(item),
    label: item.label,
    kind: TICKET_REMOVED_KIND_LABELS[item.kind],
    archivedAt: item.archivedAt,
    canRestore: item.canRestore,
  };
}

/** O tipo e o id juntos: na ficha do chamado os removidos de várias ligações se misturam. */
export function ticketRemovedKey(item: Pick<TicketRemovedItem, 'kind' | 'id'>): string {
  return `${item.kind}:${item.id}`;
}

/** O caminho de volta: `attachment:9` → o tipo e o id. Nulo quando a chave não é de chamado. */
export function parseTicketRemovedKey(
  key: string,
): { kind: TicketRemovedItem['kind']; id: number } | null {
  const [kind, id] = key.split(':');
  const parsed = Number(id);
  if (!kind || !Number.isInteger(parsed) || !(kind in TICKET_REMOVED_KIND_LABELS)) return null;

  return { kind: kind as TicketRemovedItem['kind'], id: parsed };
}

/**
 * A janela dos excluídos da Agenda: seis meses para trás e um ano para a frente. A Agenda pede
 * sempre um período, e a janela fixa deixa o bloco igual em qualquer semana que a tela mostre.
 */
export function archivedScheduleWindow(now: Date = new Date()): { startDate: string; endDate: string } {
  const day = (offset: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);

    return date.toLocaleDateString('sv-SE');
  };

  return { startDate: day(-180), endDate: day(365) };
}
