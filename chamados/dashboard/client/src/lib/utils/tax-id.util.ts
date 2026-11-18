import {
  applyMaskedInput,
  type MaskedFieldInput,
  type MaskedFieldResult,
} from './masked-field.util';

/** 12 posições de conteúdo + 2 de verificação. */
const BASE_LENGTH = 12;
const TAX_ID_LENGTH = 14;

/** Os pesos são os de sempre — o que mudou foi o valor de cada posição, não o peso. */
const FIRST_DIGIT_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_DIGIT_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function normalizeTaxId(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/[^0-9A-Za-z]/g, '')
    .toUpperCase();
}

function positionValue(character: string): number {
  return character.charCodeAt(0) - 48;
}

function checkDigit(base: string, weights: readonly number[]): string {
  const sum = base
    .split('')
    .reduce(
      (total, character, index) => total + positionValue(character) * (weights[index] ?? 0),
      0,
    );
  const remainder = sum % 11;

  return remainder < 2 ? '0' : String(11 - remainder);
}

export function taxIdCheckDigits(base: string): string {
  const normalized = normalizeTaxId(base);
  if (normalized.length !== BASE_LENGTH) return '';

  const first = checkDigit(normalized, FIRST_DIGIT_WEIGHTS);

  return first + checkDigit(normalized + first, SECOND_DIGIT_WEIGHTS);
}

export function isValidTaxId(value: string | null | undefined): boolean {
  const normalized = normalizeTaxId(value);
  if (normalized.length !== TAX_ID_LENGTH) return false;

  if (!/^\d{2}$/.test(normalized.slice(BASE_LENGTH))) return false;
  if (/^(.)\1+$/.test(normalized)) return false;

  return taxIdCheckDigits(normalized.slice(0, BASE_LENGTH)) === normalized.slice(BASE_LENGTH);
}

export function formatTaxId(value: string | null | undefined): string {
  const normalized = normalizeTaxId(value);
  if (normalized.length !== TAX_ID_LENGTH) return String(value ?? '');

  return applyMask(normalized);
}

export function maskTaxId(value: string | null | undefined): string {
  return applyMask(normalizeTaxId(value).slice(0, TAX_ID_LENGTH));
}

function applyMask(normalized: string): string {
  const parts = [
    normalized.slice(0, 2),
    normalized.slice(2, 5),
    normalized.slice(5, 8),
    normalized.slice(8, 12),
    normalized.slice(12, 14),
  ];

  return (
    parts[0] +
    (parts[1] ? `.${parts[1]}` : '') +
    (parts[2] ? `.${parts[2]}` : '') +
    (parts[3] ? `/${parts[3]}` : '') +
    (parts[4] ? `-${parts[4]}` : '')
  );
}

export type TaxIdInput = MaskedFieldInput;

export type TaxIdInputResult = MaskedFieldResult & {
  isComplete: boolean;
  isValid: boolean;
};

export function handleTaxIdInput(input: TaxIdInput): TaxIdInputResult {
  const masked = applyMaskedInput(
    input,
    (value) => normalizeTaxId(value).slice(0, TAX_ID_LENGTH),
    applyMask,
  );

  return {
    ...masked,
    isComplete: masked.raw.length === TAX_ID_LENGTH,
    isValid: isValidTaxId(masked.raw),
  };
}
