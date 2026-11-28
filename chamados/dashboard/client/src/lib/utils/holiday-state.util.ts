import { BRAZIL_STATES, HOME_STATE, isBrazilState } from '@template/shared/domain/brazil-state.util';

/**
 * A UF DOS FERIADOS ESTADUAIS do calendário do painel — a escolha de quem olha, guardada no
 * navegador. Sem ela (ou com uma sigla que não existe), Goiás, a UF da casa.
 */
const STATE_STORAGE_KEY = 'azuos-holidays-state';

/** As 27 UFs para o seletor "Feriados de" — lista fixa, sem ida ao servidor. */
export const HOLIDAY_STATE_OPTIONS = BRAZIL_STATES.map((state) => ({
  value: state.abbreviation,
  label: `${state.name} (${state.abbreviation})`,
}));

export function readHolidayState(): string {
  try {
    const stored = window.localStorage.getItem(STATE_STORAGE_KEY) ?? '';

    return isBrazilState(stored) ? stored : HOME_STATE;
  } catch {
    return HOME_STATE;
  }
}

export function writeHolidayState(state: string): void {
  try {
    window.localStorage.setItem(STATE_STORAGE_KEY, state);
  } catch {
    /* Sem armazenamento, a escolha vale até fechar a aba. */
  }
}

/** A sigla escolhida, limpa — ou nula, quando não é UF (o seletor não muda). */
export function holidayStateOf(next: string): string | null {
  if (!isBrazilState(next)) return null;

  return next.trim().toUpperCase();
}
