import { handleTaxIdInput } from './tax-id.util';
import { isValidCpf } from './cpf.util';
import {
  applyMaskedInput,
  type MaskedFieldInput,
  type MaskedFieldResult,
} from './masked-field.util';

/**
 * AS MÁSCARAS DOS FORMULÁRIOS — uma por TIPO de campo, todas no mesmo formato: o que a pessoa
 * digitou ou colou entra, sai o texto mascarado, o lugar do cursor e o que há de errado.
 *
 * A máscara é EXIBIÇÃO: colar "123.456.789-09", "12345678909" ou " 123 456 789 09 " dá o mesmo
 * campo. O cursor não pula para o fim quando se corrige no meio — quem cuida disso é
 * `applyMaskedInput`, o mesmo do CNPJ e da inscrição municipal do cadastro de Empresas.
 *
 * O erro é do FORMATO e só aparece com o campo completo ou ao sair dele (quem decide é a tela):
 * um CPF com 10 dígitos é alguém no meio da digitação, não um erro. Campo vazio nunca é erro
 * aqui — se ele é obrigatório, quem diz é o schema do documento.
 */
export const FIELD_MASKS = [
  'cpf',
  'cin',
  'cnpj',
  'cep',
  'cnae',
  'money',
  'integer',
  'cnh',
  'phone',
] as const;

export type FieldMask = (typeof FIELD_MASKS)[number];

export type FieldMaskResult = MaskedFieldResult & {
  /** O campo tem tudo que o formato pede (11 dígitos no CPF, 8 no CEP…). */
  isComplete: boolean;
  /** O problema do formato, pronto para a tela; `null` quando está certo ou vazio. */
  error: string | null;
};

const digits = (limit: number) => (value: string) => value.replace(/\D/g, '').slice(0, limit);

/** Corta o texto em pedaços e junta com a pontuação de cada posição: "00000-000". */
function pattern(groups: readonly number[], separators: readonly string[]) {
  return (raw: string) => {
    let rest = raw;
    let result = '';
    groups.forEach((size, index) => {
      if (!rest) return;
      result += (index > 0 ? separators[index - 1] : '') + rest.slice(0, size);
      rest = rest.slice(size);
    });

    return result;
  };
}

const THOUSANDS = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const MONEY = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Dinheiro se digita da direita para a esquerda, como em caixa eletrônico: "1" → "0,01",
 * "12345" → "123,45". É o que deixa digitar só números, sem procurar a vírgula, e é o mesmo
 * comportamento do internet banking que a equipe usa todo dia.
 */
function formatMoney(raw: string): string {
  if (!raw) return '';

  return MONEY.format(Number(raw) / 100);
}

function formatThousands(raw: string): string {
  if (!raw) return '';

  return THOUSANDS.format(Number(raw));
}

type MaskRule = {
  normalize: (value: string) => string;
  format: (raw: string) => string;
  /** Quantas posições o formato pede; `null` quando não há tamanho fixo. */
  length: number | null;
  /** O erro de um valor COMPLETO, ou `null`. */
  check?: (raw: string) => string | null;
};

const RULES: Record<Exclude<FieldMask, 'cnpj'>, MaskRule> = {
  cpf: {
    normalize: digits(11),
    format: pattern([3, 3, 3, 2], ['.', '.', '-']),
    length: 11,
    check: (raw) => (isValidCpf(raw) ? null : 'CPF inválido — confira os números'),
  },
  cin: {
    normalize: digits(11),
    format: pattern([3, 3, 3, 2], ['.', '.', '-']),
    length: 11,
    check: (raw) => (isValidCpf(raw) ? null : 'CIN inválida — confira o número do CPF'),
  },
  cep: { normalize: digits(8), format: pattern([5, 3], ['-']), length: 8 },
  cnae: { normalize: digits(7), format: pattern([4, 1, 2], ['-', '/']), length: 7 },
  /* 13 dígitos: até R$ 99.999.999.999,99 — o teto do schema, com folga. */
  money: {
    normalize: (value) => digits(13)(value).replace(/^0+(?=\d)/, ''),
    format: formatMoney,
    length: null,
  },
  integer: {
    normalize: (value) => digits(12)(value).replace(/^0+(?=\d)/, ''),
    format: formatThousands,
    length: null,
  },
  cnh: { normalize: digits(11), format: (raw) => raw, length: 11 },
  /* Telefone fixo tem 10 dígitos (62 3000-0000) e celular 11 (62 90000-0000): o tamanho não é um
     só, então o "completo" é a partir de 10 — ver `MIN_PHONE_DIGITS`. */
  phone: {
    normalize: digits(11),
    format: (raw) =>
      (raw.length <= 10 ? pattern([2, 4, 4], [' ', '-']) : pattern([2, 5, 4], [' ', '-']))(raw),
    length: null,
  },
};

/** DDD + 8 dígitos: o menor telefone completo. */
export const MIN_PHONE_DIGITS = 10;

const INCOMPLETE: Record<Exclude<FieldMask, 'money' | 'integer'>, string> = {
  cpf: 'O CPF tem 11 números',
  cin: 'A CIN usa os 11 números do CPF',
  cnpj: 'O CNPJ tem 14 posições',
  cep: 'O CEP tem 8 números',
  cnae: 'O CNAE tem 7 números (0000-0/00)',
  cnh: 'O número da CNH tem 11 dígitos',
  phone: 'O telefone tem DDD e número (10 ou 11 dígitos)',
};

/**
 * O HANDLER DO CAMPO MASCARADO — o que o `onChange` chama.
 *
 * `error` diz o problema do valor COMO ESTÁ; a tela mostra quando faz sentido (ao sair do campo,
 * ou já com o valor completo). Ver `fieldMaskError` para a conferência de um valor pronto.
 */
export function handleFieldMask(mask: FieldMask, input: MaskedFieldInput): FieldMaskResult {
  if (mask === 'cnpj') {
    const result = handleTaxIdInput(input);
    const error = cnpjError(result.raw, result.isComplete, result.isValid);

    return { ...result, error };
  }

  const rule = RULES[mask];
  /* Dinheiro e quantidade crescem da direita para a esquerda: o cursor se conta pelo fim. */
  const anchor = mask === 'money' || mask === 'integer' ? 'end' : 'start';
  const result = applyMaskedInput(input, rule.normalize, rule.format, anchor);
  const isComplete =
    mask === 'phone'
      ? result.raw.length >= MIN_PHONE_DIGITS
      : rule.length === null || result.raw.length === rule.length;

  return { ...result, isComplete, error: maskError(mask, result.raw, isComplete) };
}

/** O erro de um valor já digitado — o que a tela mostra quando a pessoa sai do campo. */
export function fieldMaskError(mask: FieldMask, value: string): string | null {
  if (mask !== 'money' && mask !== 'integer') {
    const limit = mask === 'cnpj' ? 14 : RULES[mask].length;
    const content = value.replace(/[.,\-/\s]/g, '');
    if (limit !== null && content.length > limit) return INCOMPLETE[mask];
  }

  return handleFieldMask(mask, { value }).error;
}

/** O texto mascarado de um valor que chegou de fora (um exemplo, o Cartão CNPJ, um rascunho). */
export function formatFieldMask(mask: FieldMask, value: string): string {
  return handleFieldMask(mask, { value }).value;
}

/**
 * Um valor guardado ganha pontuação sem perder conteúdo. Excesso de dígitos ou letras num
 * campo numérico precisa continuar visível para correção, em vez de ser truncado ao abrir.
 */
export function formatStoredFieldMask(mask: FieldMask, value: string): string {
  const result = handleFieldMask(mask, { value });
  const content = value.replace(/[.,\-/\s]/g, '').toUpperCase();
  if (result.raw !== content) return value;

  return result.value;
}

function maskError(
  mask: Exclude<FieldMask, 'cnpj'>,
  raw: string,
  isComplete: boolean,
): string | null {
  if (!raw) return null;
  if (!isComplete) return mask === 'money' || mask === 'integer' ? null : INCOMPLETE[mask];

  return RULES[mask].check?.(raw) ?? null;
}

function cnpjError(raw: string, isComplete: boolean, isValid: boolean): string | null {
  if (!raw) return null;
  if (!isComplete) return INCOMPLETE.cnpj;

  return isValid ? null : 'CNPJ inválido — confira os números';
}
