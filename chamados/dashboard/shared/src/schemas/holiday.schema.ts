import { z } from 'zod';

import { HOME_STATE, isBrazilState } from '../domain/brazil-state.util';

/**
 * OS FERIADOS — nacionais e os de uma UF, para o calendário do painel marcar o dia.
 *
 * Vêm da BrasilAPI (pública, sem cadastro), pelo servidor. A UF é escolha de quem olha: o
 * calendário abre em Goiás, a UF da casa, e a pessoa troca para ver outra. Os municipais a API
 * não traz.
 *
 * Feriado nunca derruba o calendário: com a API fora do ar, a lista vem vazia e `source` diz
 * por quê — o calendário continua mostrando o resto.
 */
export const HOLIDAY_LEVELS = ['national', 'state', 'other'] as const;

export const holidaySchema = z.object({
  /** O dia, `aaaa-mm-dd`. */
  date: z.iso.date(),
  name: z.string(),
  level: z.enum(HOLIDAY_LEVELS),
});

export type Holiday = z.infer<typeof holidaySchema>;

/**
 * O ano (de 2000 a 2100: um ano absurdo não é pergunta para a API) e a UF, pela sigla. Sem UF,
 * Goiás.
 */
export const holidayListQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2000, 'Ano fora do intervalo')
    .max(2100, 'Ano fora do intervalo'),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine(isBrazilState, 'Informe a sigla de uma UF, como GO')
    .default(HOME_STATE),
});

export type HolidayListQuery = z.infer<typeof holidayListQuerySchema>;

export const HOLIDAY_SOURCES = ['brasilapi', 'unavailable'] as const;

export type HolidaySource = (typeof HOLIDAY_SOURCES)[number];

export const holidayListSchema = z.object({
  holidays: z.array(holidaySchema),
  year: z.number().int(),
  /** A UF dos feriados estaduais. */
  state: z.string(),
  /** De onde veio a lista: da API, ou vazia porque a API não respondeu. */
  source: z.enum(HOLIDAY_SOURCES),
});

export type HolidayList = z.infer<typeof holidayListSchema>;
