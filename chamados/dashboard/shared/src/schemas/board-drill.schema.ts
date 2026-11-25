import { z } from 'zod';

import {
  TICKET_STATUS_LABELS,
  ticketPriorityLabel,
  type TicketPriority,
} from '../domain/ticket-status.util';
import {
  BOARD_FILTER_KIND_LABELS,
  type BoardMatch,
  DATA_SOURCES,
  type DataSourceKey,
  dimensionsOf,
  ME_VALUE,
  WIDGET_PERIOD_LABELS,
  widgetQuerySchema,
  windowLabel,
} from './dashboard-board.schema';

/**
 * O RECORTE DE UM CLIQUE NO PAINEL — a pergunta inteira do bloco (fonte, filtro salvo, período,
 * "só os meus", os filtros do painel) e o item clicado: o valor do agrupamento e, nos blocos que
 * cruzam duas categorias, o da divisão.
 *
 * A tela da fonte recebe ISTO, e não uma tradução campo a campo para os filtros dela: o servidor
 * monta com o recorte a MESMA condição que contou o bloco. É assim que o número clicado é o total
 * da lista aberta — por construção, e não porque duas regras foram mantidas iguais à mão.
 *
 * O recorte só estreita: a lista de destino continua aplicando a permissão de quem vê.
 */
export const boardDrillSchema = widgetQuerySchema.extend({
  /** O valor clicado no agrupamento (`groupBy`). Nulo: o bloco inteiro (os cards sem agrupar). */
  key: z.string().max(200).nullable().default(null),
  /** O valor clicado na divisão (`splitBy`), nos blocos de par. */
  key2: z.string().max(200).nullable().default(null),
  /** O nome de cada valor, como o bloco mostrou — só para a faixa da tela dizer o recorte. */
  label: z.string().max(200).nullable().default(null),
  label2: z.string().max(200).nullable().default(null),
  /** O título do bloco clicado — só para a faixa. */
  title: z.string().max(60).nullable().default(null),
});

export type BoardDrill = z.infer<typeof boardDrillSchema>;
export type BoardDrillInput = z.input<typeof boardDrillSchema>;

/**
 * O recorte como parâmetro da URL e da API: o objeto em JSON, numa string. Um JSON quebrado é
 * recusado com a frase, e não vira erro 500.
 */
export const boardDrillParamSchema = z
  .string()
  .max(8000)
  .transform((text, context) => {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      context.addIssue({ code: 'custom', message: 'O recorte do painel não é um JSON válido' });

      return z.NEVER;
    }
  })
  .pipe(boardDrillSchema);

/** O nome do parâmetro do recorte, na URL da tela e na chamada da API. */
export const DRILL_PARAM = 'drill';

export function drillParam(drill: BoardDrill): string {
  return JSON.stringify(drill);
}

/** O recorte de um parâmetro da URL; inválido ou ausente, nulo — a tela abre sem recorte. */
export function drillFromParam(text: string | null | undefined): BoardDrill | null {
  if (!text) return null;
  const parsed = boardDrillParamSchema.safeParse(text);

  return parsed.success ? parsed.data : null;
}

/**
 * O recorte em palavras, para a faixa da tela: o bloco, o item clicado, o período e o que mais o
 * estreitou.
 */
export function drillSummary(drill: BoardDrill): string[] {
  return [
    drill.title ?? DATA_SOURCES[drill.source].label,
    itemPart(drill.source, drill.groupBy, drill.key, drill.label),
    itemPart(drill.source, drill.splitBy, drill.key2, drill.label2),
    periodPart(drill),
    drill.window ? windowLabel(drill.window) : null,
    drill.onlyMine ? 'Só os meus' : null,
    drill.person ? `${BOARD_FILTER_KIND_LABELS.person}: ${personLabel(drill.person)}` : null,
    ...drill.matches.map(matchPart),
    drill.filterId ? 'Com o filtro salvo do bloco' : null,
  ].filter((part): part is string => Boolean(part));
}

function itemPart(
  source: DataSourceKey,
  dimension: string | null,
  key: string | null,
  label: string | null,
): string | null {
  if (!dimension || key === null) return null;
  const name = (dimensionsOf(source) as Record<string, { label: string }>)[dimension]?.label;

  return `${name ?? dimension}: ${label ?? key}`;
}

function periodPart(drill: BoardDrill): string | null {
  if (drill.boardPeriod) return windowLabel(drill.boardPeriod);
  if (drill.period === 'all') return null;

  return WIDGET_PERIOD_LABELS[drill.period];
}

/** O "eu" do filtro é quem está vendo. */
function personLabel(person: string): string {
  return person === ME_VALUE ? 'Eu' : person;
}

const MATCH_LABELS: Record<string, string> = {
  status: 'Situação',
  priority: 'Prioridade',
  department: BOARD_FILTER_KIND_LABELS.department,
};

/** A situação e a prioridade guardam a chave ("em_andamento"); a faixa mostra o nome. */
function matchValue(match: BoardMatch): string {
  if (match.field === 'status')
    return (TICKET_STATUS_LABELS as Record<string, string>)[match.value] ?? match.value;
  if (match.field === 'priority')
    return ticketPriorityLabel(match.value as TicketPriority) ?? match.value;

  return match.value;
}

function matchPart(match: BoardMatch): string {
  return `${MATCH_LABELS[match.field] ?? match.field}: ${matchValue(match)}`;
}
