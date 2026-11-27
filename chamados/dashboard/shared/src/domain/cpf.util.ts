/**
 * CPF — só o conferir e o formatar, que é o que os documentos precisam.
 *
 * O documento leva o CPF que a pessoa digitou, e um dígito trocado ali só aparece quando a
 * Junta devolve o processo. Conferir o dígito verificador ANTES de gerar o arquivo pega o erro
 * enquanto ele ainda custa um retoque no formulário.
 */
export function cpfDigits(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}

function checkDigit(digits: string, length: number): number {
  const sum = digits
    .slice(0, length)
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
  const remainder = (sum * 10) % 11;

  return remainder === 10 ? 0 : remainder;
}

/** CPF com 11 dígitos, dígitos verificadores certos e sem ser a mesma cifra repetida. */
export function isValidCpf(value: string | null | undefined): boolean {
  const digits = cpfDigits(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  return (
    checkDigit(digits, 9) === Number(digits[9]) && checkDigit(digits, 10) === Number(digits[10])
  );
}

/** "12345678909" → "123.456.789-09". Valor que não tem 11 dígitos volta como veio. */
export function formatCpf(value: string | null | undefined): string {
  const digits = cpfDigits(value);
  if (digits.length !== 11) return String(value ?? '').trim();

  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
