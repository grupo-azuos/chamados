import { goto } from '$app/navigation';
import { page } from '$app/state';
import { type RoleContext } from '@template/shared/domain/role-context.util';
import {
  type BoardDrill,
  DRILL_PARAM,
  drillFromParam,
  drillSummary,
} from '@template/shared/schemas/board-drill.schema';
import { type Readable, toStore } from 'svelte/store';

import { contextPath } from '$lib/navigation/navigation';

/**
 * O RECORTE DO PAINEL NUMA TELA DE DESTINO — o que veio do clique num item do Painel
 * (`?drill=`). Zero marcação.
 *
 * Com recorte, a tela abre SÓ com ele: os filtros guardados dela ficam de lado (não se apagam) e
 * voltam no "Limpar recorte". A faixa do recorte fica à vista enquanto ele valer. Um recorte que
 * não dá para ler não quebra a tela: ela abre sem ele, e a faixa avisa.
 */
export type BoardDrillModel = {
  /** O recorte que vale; nulo sem recorte. */
  readonly drill: BoardDrill | null;
  /**
   * O recorte em store, para a consulta da lista: ela refaz a busca quando ele entra ou sai (o
   * "Limpar recorte" fica na mesma tela).
   */
  store: Readable<BoardDrill | null>;
  /** A faixa: o recorte em palavras, ou o aviso de que ele não valeu. Nula sem recorte. */
  readonly banner: BoardDrillBanner | null;
  onClear: () => void;
  /** De volta ao Painel do módulo. */
  onBack: () => void;
};

export type BoardDrillBanner = { summary: string[]; notice: string | null };

export const DRILL_UNREADABLE = 'Não deu para ler o recorte do painel: a tela abriu sem ele.';

/** `path`: a tela de destino, sem o recorte — para onde o "Limpar recorte" volta. */
export function useBoardDrillModel(input: { module: RoleContext; path: string }): BoardDrillModel {
  const text = $derived(page.url.searchParams.get(DRILL_PARAM));
  const drill = $derived(drillFromParam(text));

  return {
    get drill() {
      return drill;
    },
    store: toStore(() => drill),
    get banner() {
      return drillBannerOf(text, drill);
    },
    onClear: () => void goto(input.path, { replaceState: true, keepFocus: true, noScroll: true }),
    onBack: () => void goto(contextPath(input.module, '/dashboard')),
  };
}

/** Exportada para ter teste próprio: o que a faixa diz em cada caso. */
export function drillBannerOf(text: string | null, drill: BoardDrill | null): BoardDrillBanner | null {
  if (!text) return null;
  if (!drill) return { summary: [], notice: DRILL_UNREADABLE };

  return { summary: drillSummary(drill), notice: null };
}
