/**
 * LEITORES DE CAMPO para o filtro salvo — o `parse` de cada tela, sem repetir a mesma checagem.
 *
 * O salvo vem de fora do programa (o `localStorage` é editável e sobrevive a versões), então
 * cada campo é conferido sozinho: um campo ruim volta ao padrão e os outros continuam valendo.
 * Jogar tudo fora por causa de um campo faria a pessoa perder o recorte inteiro numa troca
 * pequena, como um status que deixou de existir.
 */

export type FieldGuards<TFilters> = { [K in keyof TFilters]: (value: unknown) => value is TFilters[K] };

export const isText = (value: unknown): value is string => typeof value === 'string';

export const isFlag = (value: unknown): value is boolean => typeof value === 'boolean';

export function oneOf<const TValue extends string>(
  ...allowed: readonly TValue[]
): (value: unknown) => value is TValue {
  return (value): value is TValue =>
    typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/** Guarda apoiada num schema zod do contrato — o enum vive em `@template/shared`, uma vez só. */
export function matches<TValue>(schema: {
  safeParse: (value: unknown) => { success: boolean };
}): (value: unknown) => value is TValue {
  return (value): value is TValue => schema.safeParse(value).success;
}

/**
 * Monta o `parse` do `persistedFilterStore`: objeto → campo a campo; qualquer outra coisa →
 * `null` (ausente). Campo faltando ou inválido assume o valor do padrão.
 */
export function fieldParser<TFilters extends object>(
  defaults: TFilters,
  guards: FieldGuards<TFilters>,
): (raw: unknown) => TFilters | null {
  return (raw) => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;

    const source = raw as Record<string, unknown>;
    const result = { ...defaults };

    for (const key of Object.keys(guards) as (keyof TFilters)[]) {
      const guard = guards[key];
      const value = source[key as string];

      if (guard(value)) result[key] = value;
    }

    return result;
  };
}

/**
 * Monta o `fromUrl` do `persistedFilterStore`: lê do endereço só os campos que a tela conhece,
 * com as MESMAS guardas do salvo — a URL também vem de fora do programa. Campo de sim/não chega
 * como `true`/`false` em texto. Sem nenhum campo válido, devolve `null`: a tela abre com o salvo.
 */
export function urlParser<TFilters extends object>(
  defaults: TFilters,
  guards: FieldGuards<TFilters>,
): (params: URLSearchParams) => Partial<TFilters> | null {
  return (params) => {
    const result: Partial<TFilters> = {};

    for (const key of Object.keys(guards) as (keyof TFilters)[]) {
      const raw = params.get(key as string);
      if (raw === null) continue;

      const value = typeof defaults[key] === 'boolean' ? raw === 'true' : raw;
      if (guards[key](value)) result[key] = value;
    }

    return Object.keys(result).length > 0 ? result : null;
  };
}
