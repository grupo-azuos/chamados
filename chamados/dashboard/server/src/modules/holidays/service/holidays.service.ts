import { Injectable } from '@nestjs/common';

import { type Holiday, type HolidaySource } from '@template/shared/schemas/holiday.schema';

import { HolidaysClient } from '../repository/holidays.client';

/** Um dia: feriado do ano não muda de manhã para a tarde. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type HolidayYear = {
  holidays: Holiday[];
  state: string;
  source: HolidaySource;
};

/**
 * OS FERIADOS DE UM ANO — nacionais e os da UF pedida (a tela abre em Goiás, a UF da casa,
 * e a pessoa pode olhar outra).
 *
 * Guardados em memória por um dia, por ano e UF, e só quando a API respondeu: a falha não fica
 * guardada, para a próxima abertura do calendário tentar de novo. Com a API fora do ar, a lista
 * vem vazia e o `source` diz por quê — o calendário nunca cai por causa de feriado.
 */
@Injectable()
export class HolidaysService {
  private readonly cache = new Map<string, { at: number; holidays: Holiday[] }>();

  constructor(private readonly client: HolidaysClient) {}

  async year(year: number, state: string): Promise<HolidayYear> {
    const key = `${year}:${state}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return { holidays: cached.holidays, state, source: 'brasilapi' };
    }

    const holidays = await this.client.fetchYear(year, state);
    if (!holidays) return { holidays: [], state, source: 'unavailable' };

    this.cache.set(key, { at: Date.now(), holidays });

    return { holidays, state, source: 'brasilapi' };
  }
}
