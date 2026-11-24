import { type TicketStockDirection } from '@template/shared/domain/ticket-stock.util';
import {
  type TicketStockItem,
  type TicketStockOption,
} from '@template/shared/schemas/ticket-stock-item.schema';

/**
 * O ESTOQUE DO CHAMADO POR MÁQUINA — 1 máquina para vários itens: a ficha mostra "Computador 01 →
 * Monitor 24 ×2, Teclado ×1", e o diálogo "Vincular itens" escolhe a máquina de um lado e marca os
 * itens (com a quantidade) do outro.
 */
export type TicketStockGroup = {
  /** A máquina, pelo id em texto; vazio é "Sem máquina". */
  machineId: string;
  machineName: string | null;
  items: TicketStockItem[];
};

/** Os itens juntos pela máquina, na ordem em que a primeira de cada apareceu; "Sem máquina" por último. */
export function groupByMachine(items: readonly TicketStockItem[]): TicketStockGroup[] {
  const groups: TicketStockGroup[] = [];
  for (const item of items) {
    const machineId = item.computerId ? String(item.computerId) : '';
    const group = groups.find((current) => current.machineId === machineId);
    if (group) group.items.push(item);
    else groups.push({ machineId, machineName: item.computerName ?? null, items: [item] });
  }

  return [
    ...groups.filter((group) => group.machineId),
    ...groups.filter((group) => !group.machineId),
  ];
}

/** O que foi marcado no diálogo: o item (id em texto) → a quantidade digitada. */
export type TicketStockSelection = Record<string, string>;

/**
 * O que está errado na escolha, por item (a mensagem que aparece embaixo da quantidade): número
 * inteiro maior que zero e, na saída, não mais do que sobra.
 */
export function selectionErrors(
  selection: TicketStockSelection,
  options: readonly TicketStockOption[],
  direction: TicketStockDirection,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [itemId, typed] of Object.entries(selection)) {
    const quantity = Number(typed);
    const available = options.find((option) => String(option.id) === itemId)?.available ?? 0;
    if (!Number.isInteger(quantity) || quantity < 1)
      errors[itemId] = 'Quantidade inteira, de 1 para cima';
    else if (direction === 'out' && quantity > available)
      errors[itemId] = `Só ${available} disponível`;
  }

  return errors;
}

/** As opções do lado dos itens: na saída só o que sobra; e a busca pelo nome. */
export function linkOptions(
  options: readonly TicketStockOption[],
  direction: TicketStockDirection,
  search: string,
): TicketStockOption[] {
  const wanted = search.trim().toLocaleLowerCase('pt-BR');

  return options.filter(
    (option) =>
      (direction === 'in' || option.available > 0) &&
      (!wanted || option.name.toLocaleLowerCase('pt-BR').includes(wanted)),
  );
}
