/**
 * Casar empresa por nome, e achar empresa na busca. São duas chaves diferentes de
 * propósito, e as duas erram para o mesmo lado: mostrar demais, nunca de menos.
 */

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Chave de identidade da empresa pelo nome.
 *
 * A comparação anterior só tirava acento e caixa: não colapsava espaço interno nem
 * pontuação. "MASTER FORT - TELHAS" com dois espaços, ou virando "MASTER FORT -
 * TELHAS LTDA.", deixava de casar e a empresa DESAPARECIA da tela de todo mundo.
 * Corrigir o nome na planilha — coisa que se faz sem pensar — apagava a empresa.
 *
 * Aqui a chave é mais tolerante, e a tolerância só ajuda nos dois usos: para a
 * empresa sobreviver ao sync, e para não criar duplicata.
 */
export function companyNameKey(value: string | null | undefined): string {
  return stripAccents(String(value ?? ''))
    .toUpperCase()
    .replace(/[.,;:/\\'"()[\]]/g, ' ')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchKey(value: string | null | undefined): string {
  return stripAccents(String(value ?? ''))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function digitsOnly(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}

export type SearchableCompany = {
  name?: string | null;
  city?: string | null;
  group?: string | null;
  owner?: string | null;
  taxId?: string | null;
  municipalRegistration?: string | null;
};

/**
 * Seis dígitos porque três casam com qualquer coisa. Quem procura por número digita
 * o CNPJ ou boa parte dele.
 */
const MIN_NUMERIC_TERM_LENGTH = 6;

/**
 * CNPJ e inscrição são NÚMERO, não texto — por isso saem da comparação textual.
 * Compará-los como texto fazia "0001" casar com todo CNPJ de matriz: medido nas
 * 1.044 empresas reais, "sala 001" trazia 542 resultados, 52% do cadastro. Isso é
 * pior que não achar — quem vê zero recarrega, quem vê 542 desiste.
 *
 * E a regra de dígitos só vale para termo que é SÓ número: rodá-la no termo cru
 * transformava qualquer busca com número em busca por pedaço de CNPJ.
 */
export function companyMatchesSearch(
  company: SearchableCompany | null | undefined,
  term: string | null | undefined,
): boolean {
  const normalized = searchKey(term);
  if (!normalized) return true;
  if (!company) return false;

  const textFields = [company.name, company.city, company.group, company.owner];
  if (textFields.some((field) => searchKey(field).includes(normalized))) return true;

  const isNumericTerm = /^[\d.\-/\s]+$/.test(String(term ?? ''));
  const digits = isNumericTerm ? digitsOnly(term) : '';
  if (digits.length < MIN_NUMERIC_TERM_LENGTH) return false;
  if (digitsOnly(company.taxId).includes(digits)) return true;

  return digitsOnly(company.municipalRegistration).includes(digits);
}
