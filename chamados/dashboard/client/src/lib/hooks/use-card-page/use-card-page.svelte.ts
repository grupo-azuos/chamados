/**
 * A PÁGINA DA GRADE DE CARDS — para as listas que já chegam inteiras do servidor (até o teto da
 * consulta) e mostram cards.
 *
 * A regra do grupo é grade de cards sempre paginada (`AzuosPaginationBar`): duzentos cartões de
 * uma vez não se leem, e a tela pesa. A tabela continua rolando inteira; só a grade pagina. A
 * página nunca passa da última — quando um filtro encolhe a lista, ela volta para onde há cards.
 *
 * Doze por página: cabe certinho em 1, 2, 3 ou 4 colunas, sem sobrar buraco na última fileira.
 */
export const CARD_PAGE_SIZE = 12;

/** Quantas páginas a lista tem; uma, no mínimo, para a barra nunca dizer "página 1 de 0". */
export function cardPageCountOf(total: number, pageSize: number = CARD_PAGE_SIZE): number {
  if (pageSize <= 0) return 1;

  return Math.max(1, Math.ceil(total / pageSize));
}

/** Os cards da página pedida, com a página presa entre a primeira e a última. */
export function cardPageOf<T>(items: readonly T[], page: number, pageSize: number = CARD_PAGE_SIZE): T[] {
  const last = cardPageCountOf(items.length, pageSize);
  const current = Math.min(Math.max(1, Math.floor(page)), last);
  const start = (current - 1) * pageSize;

  return items.slice(start, start + pageSize);
}

export function useCardPage<T>(getItems: () => readonly T[], pageSize: number = CARD_PAGE_SIZE) {
  let requested = $state(1);

  const page = $derived(Math.min(requested, cardPageCountOf(getItems().length, pageSize)));

  return {
    get page() {
      return page;
    },
    get items() {
      return cardPageOf(getItems(), page, pageSize);
    },
    get total() {
      return getItems().length;
    },
    pageSize,
    actions: {
      onPageChange: (next: number) => {
        requested = Math.max(1, Math.floor(next));
      },
    },
  };
}
