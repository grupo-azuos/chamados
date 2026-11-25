import { inventoryNameKey } from '@template/shared/domain/inventory-name.util';
import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';
import { type TicketStockLink } from '@template/shared/schemas/ticket-stock-item.schema';

/**
 * Um produto do DEPÓSITO: todos os cadastros do inventário com o mesmo nome (sem diferença de
 * maiúscula). O Depósito conta "Cadeira", não cada cadeira cadastrada.
 */
export type StockGroup = {
  key: string;
  name: string;
  /** A categoria e a medida do primeiro cadastro — o que o cartão mostra. */
  category: InventoryItem['category'];
  unit: InventoryItem['unit'];
  /** Quanto há na prateleira: a soma dos saldos do nome. */
  balance: number;
  /** Os cadastros do nome no inventário (as cadeiras com pessoa e lugar). */
  items: InventoryItem[];
  ticketLinks: TicketStockLink[];
};

/** Os produtos do inventário agrupados pelo nome, na ordem em que o primeiro de cada um chegou. */
export function groupStock(items: readonly InventoryItem[]): StockGroup[] {
  const groups = new Map<string, StockGroup>();
  for (const item of items) {
    const key = inventoryNameKey(item.name);
    const group = groups.get(key) ?? newGroup(key, item);
    group.balance += item.balance;
    group.items.push(item);
    group.ticketLinks.push(...(item.ticketLinks ?? []));
    groups.set(key, group);
  }

  return [...groups.values()];
}

function newGroup(key: string, item: InventoryItem): StockGroup {
  return {
    key,
    name: item.name.trim(),
    category: item.category,
    unit: item.unit,
    balance: 0,
    items: [],
    ticketLinks: [],
  };
}

/**
 * O produto como o diálogo de entrada e saída mostra: o primeiro cadastro, com o nome e o saldo
 * do GRUPO — o movimento vai pelo nome, e o servidor decide de qual cadastro sai.
 */
export function stockItemOf(group: StockGroup): InventoryItem {
  return { ...group.items[0]!, name: group.name, balance: group.balance };
}
