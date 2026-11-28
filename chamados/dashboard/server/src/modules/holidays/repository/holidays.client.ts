import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

import { type Holiday } from '@template/shared/schemas/holiday.schema';

/**
 * A API de feriados da BrasilAPI: os nacionais (com os móveis — Carnaval, Páscoa — já calculados)
 * e, com `uf`, os estaduais. Pública, sem cadastro nem chave.
 */
const API_URL = 'https://brasilapi.com.br/api/feriados/v1';

/** Curto: feriado é enfeite do calendário, e não pode prender a tela esperando. */
const TIMEOUT_MS = 5_000;

/**
 * O que a API devolve, lido com folga: só `date` e `name` são exigidos. Campo novo do lado de
 * lá não quebra nada aqui, e item que não tem os dois é descartado — nunca um feriado chutado.
 */
const remoteHolidaySchema = z.object({
  date: z.iso.date(),
  name: z.string().min(1),
  type: z.string().optional(),
});

/** `undefined`: não houve resposta utilizável (fora do ar, UF recusada, formato estranho). */
export type HolidayFetch = Holiday[] | undefined;

/** O CLIENTE DA API DE FERIADOS — o único lugar que fala com ela. */
@Injectable()
export class HolidaysClient {
  private readonly logger = new Logger(HolidaysClient.name);

  async fetchYear(year: number, state: string): Promise<HolidayFetch> {
    try {
      const response = await fetch(`${API_URL}/${year}?uf=${encodeURIComponent(state)}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn(`The holidays API answered ${response.status} for ${year}/${state}`);
        return undefined;
      }

      return toHolidays(await response.json());
    } catch (error) {
      this.logger.warn(`The holidays API is unreachable: ${(error as Error).message}`);
      return undefined;
    }
  }
}

/** A resposta vira a lista do contrato, em ordem de data, sem item inválido nem repetido. */
export function toHolidays(body: unknown): HolidayFetch {
  if (!Array.isArray(body)) return undefined;

  const seen = new Set<string>();

  return body
    .map((item) => remoteHolidaySchema.safeParse(item))
    .flatMap((parsed) => (parsed.success ? [parsed.data] : []))
    .filter((item) => {
      const key = `${item.date}|${item.name}`;
      if (seen.has(key)) return false;
      seen.add(key);

      return true;
    })
    .map((item) => ({ date: item.date, name: item.name, level: levelOf(item.type) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** `national` e `state` são os dois tipos que a API escreve; o resto fica como "outro". */
function levelOf(type: string | undefined): Holiday['level'] {
  if (type === 'national') return 'national';
  if (type === 'state') return 'state';

  return 'other';
}
