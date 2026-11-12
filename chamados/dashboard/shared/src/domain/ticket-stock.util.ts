import { type TicketArea } from './ticket-catalog.util';

/**
 * OS ITENS DE ESTOQUE de um chamado — além da máquina, o atendimento pode tirar peças da
 * prateleira (saída) ou devolver peças a ela (entrada), quantas forem.
 *
 * Cada módulo tem a PRÓPRIA prateleira, e uma não invade a outra: Infraestrutura mexe no
 * Depósito da TI (`parts`), Manutenção mexe no Depósito da Manutenção (`inventory_items`).
 * Sistema não tem prateleira.
 *
 * O item vinculado NÃO mexe no saldo na hora: ele fica RESERVADO enquanto o chamado está
 * aberto, e o Depósito mostra a qual chamado ele está preso. O saldo só anda quando o chamado
 * é encerrado — é o encerramento que diz "isto de fato saiu".
 */

/** De qual prateleira o item vem. */
export const TICKET_STOCK_SOURCES = ['parts', 'inventory'] as const;

export type TicketStockSource = (typeof TICKET_STOCK_SOURCES)[number];

/** O sentido do item no chamado: sai da prateleira ou volta para ela. */
export const TICKET_STOCK_DIRECTIONS = ['out', 'in'] as const;

export type TicketStockDirection = (typeof TICKET_STOCK_DIRECTIONS)[number];

export const TICKET_STOCK_DIRECTION_LABELS: Record<TicketStockDirection, string> = {
  out: 'Saída',
  in: 'Entrada',
};

export function ticketStockDirectionLabel(direction: TicketStockDirection): string {
  return TICKET_STOCK_DIRECTION_LABELS[direction];
}

/** A área DONA de cada prateleira — é ela que o chamado precisa ter para mexer ali. */
const SOURCE_AREA: Record<TicketStockSource, TicketArea> = {
  parts: 'infra',
  inventory: 'manutencao',
};

export function ticketStockSourceArea(source: TicketStockSource): TicketArea {
  return SOURCE_AREA[source];
}

/** A prateleira da área, ou `null` para a área que não tem prateleira (Sistema). */
export function ticketStockSourceOf(area: TicketArea): TicketStockSource | null {
  const found = TICKET_STOCK_SOURCES.find((source) => SOURCE_AREA[source] === area);

  return found ?? null;
}

/** Mais que isso num chamado só é inventário, não atendimento. */
export const MAX_TICKET_STOCK_QUANTITY = 9999;

/**
 * Quanto do item ainda pode SAIR por um chamado: o saldo da prateleira menos o que outros
 * chamados abertos já reservaram. Nunca negativo — reserva maior que o saldo (alguém tirou
 * pela tela do Depósito) só quer dizer que não sobra nada.
 */
export function availableForTicket(balance: number, reservedOut: number): number {
  return Math.max(0, balance - reservedOut);
}

/**
 * Por que este item NÃO pode entrar no chamado, em português — ou `null` se pode.
 *
 * Entrada não tem teto: devolver à prateleira nunca falta. Saída só cabe no que sobra depois
 * das reservas dos outros chamados.
 */
export function refuseTicketStockItem(input: {
  name: string;
  direction: TicketStockDirection;
  quantity: number;
  available: number;
}): string | null {
  if (input.direction === 'in') return null;
  if (input.quantity <= input.available) return null;
  if (input.available === 0) return `Não há ${input.name} disponível no depósito.`;

  return `Só há ${input.available} de ${input.name} disponível no depósito.`;
}

/**
 * O encerramento CABE na prateleira? Na hora de encerrar, a saída vira movimento de verdade —
 * e, se alguém tirou o item pela tela do Depósito nesse meio-tempo, o saldo pode não bastar.
 */
export function refuseTicketStockSettlement(input: {
  name: string;
  direction: TicketStockDirection;
  quantity: number;
  balance: number;
}): string | null {
  if (input.direction === 'in') return null;
  if (input.quantity <= input.balance) return null;

  return `O depósito tem ${input.balance} de ${input.name}, e o chamado tira ${input.quantity}. Ajuste o item ou registre a entrada que faltou antes de encerrar.`;
}

/** O saldo depois de o item do chamado virar movimento. */
export function balanceAfterTicketItem(
  balance: number,
  direction: TicketStockDirection,
  quantity: number,
): number {
  return direction === 'in' ? balance + quantity : balance - quantity;
}

/**
 * Tirar do chamado um item que JÁ mexeu no saldo (o chamado foi encerrado e reaberto) desfaz o
 * movimento: a saída volta para a prateleira, a entrada sai dela. Este é o sentido do desfazer.
 */
export function reverseTicketStockDirection(direction: TicketStockDirection): TicketStockDirection {
  return direction === 'in' ? 'out' : 'in';
}
