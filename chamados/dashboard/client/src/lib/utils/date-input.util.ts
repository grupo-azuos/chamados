/**
 * A DATA DIGITADA: `dd/mm/aaaa` na tela, ISO (`aaaa-mm-dd`) no contrato.
 *
 * Um lugar só para as três conversões, porque o campo de data e o campo de período digitam do
 * mesmo jeito — e duas máscaras escritas à mão acabam aceitando coisas diferentes.
 *
 * Nada aqui passa por `Date` para montar o texto: o ISO sai dos próprios dígitos digitados. O
 * `Date` entra só para CONFERIR que o dia existe (31/02 não existe), ao meio-dia local, que é o
 * horário que não muda de dia em nenhum fuso do Brasil.
 */

/**
 * O que a pessoa digitou virando `dd/mm/aaaa`, com as barras entrando sozinhas.
 *
 * Só os dígitos contam: quem digita `25031990`, `25/03/1990` ou cola `25-03-1990` chega ao mesmo
 * texto. Apagar uma barra não trava o campo, porque ela é redesenhada a partir dos dígitos.
 */
export function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);

  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}

/** `25/03/1990` → `1990-03-25`. Texto incompleto ou dia que não existe devolve `null`. */
export function isoFromDisplay(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  /* O `Date` aceita 31/02 e devolve 03/03: só é data de verdade se os três campos voltarem
     iguais ao que entrou. É o que também barra ano de dois dígitos (`0026` vira 1926). */
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return `${yearText}-${monthText}-${dayText}`;
}

/** `1990-03-25` → `25/03/1990`. Vazio ou texto que não é data devolve texto vazio. */
export function displayFromIso(iso: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!match) return '';

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return '';
  }

  return `${dayText}/${monthText}/${yearText}`;
}

/**
 * A data está dentro do limite? Sem limite, toda data serve.
 *
 * Comparação de TEXTO, de propósito: no formato ISO a ordem alfabética é a ordem do calendário, e
 * comparar texto não tem fuso para errar.
 */
export function isIsoWithin(iso: string, min?: string | null, max?: string | null): boolean {
  if (min && iso < min.slice(0, 10)) return false;
  if (max && iso > max.slice(0, 10)) return false;

  return true;
}

/** A frase que explica o limite, para a mensagem de erro do campo. */
export function rangeHint(min?: string | null, max?: string | null): string {
  if (min && max) return `Escolha uma data entre ${displayFromIso(min)} e ${displayFromIso(max)}.`;
  if (min) return `Escolha uma data a partir de ${displayFromIso(min)}.`;
  if (max) return `Escolha uma data até ${displayFromIso(max)}.`;

  return '';
}
