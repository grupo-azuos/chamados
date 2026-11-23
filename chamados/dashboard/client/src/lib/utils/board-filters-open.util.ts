/**
 * A FAIXA DE FILTROS DO PAINEL ABERTA OU FECHADA — uma escolha de quem vê, lembrada por painel
 * (Equipe, Gestor, Pessoal, de cada módulo): quem fecha os filtros do painel da Equipe para ver
 * mais blocos não os encontra fechados no Pessoal.
 *
 * Nasce ABERTA: quem nunca tocou na seta vê os filtros. Tudo aqui é defensivo — `localStorage`
 * lança em janela privada e com cookies bloqueados, e o valor salvo pode ser qualquer texto; em
 * qualquer um desses casos vale o padrão, nunca uma tela quebrada.
 */

export function boardFiltersOpenKey(board: string): string {
  return `azuos:dashboard:filters-open:${board}`;
}

/** Se a faixa de filtros do painel está aberta; sem escolha salva (ou sem como ler), aberta. */
export function readBoardFiltersOpen(board: string): boolean {
  if (typeof window === 'undefined') return true;

  try {
    return window.localStorage.getItem(boardFiltersOpenKey(board)) !== 'closed';
  } catch {
    return true;
  }
}

export function writeBoardFiltersOpen(board: string, isOpen: boolean): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(boardFiltersOpenKey(board), isOpen ? 'open' : 'closed');
  } catch {
    /* Gravação recusada (janela privada, cota cheia): a escolha vale até a tela recarregar. */
  }
}
