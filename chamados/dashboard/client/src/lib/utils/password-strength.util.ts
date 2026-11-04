export const MIN_PASSWORD_LENGTH = 8;

/**
 * A FORÇA DA SENHA — e ela é um CONSELHO, nunca uma trava.
 *
 * Quem recusa a senha é o `passwordSchema` do `shared` (o mesmo do servidor) e, depois dele,
 * o Supabase, que barra senha que já apareceu em vazamento. Este arquivo não recusa nada: ele
 * mostra à pessoa o quanto a senha que ela está digitando resiste, enquanto ela digita.
 *
 * A separação é de propósito. Uma barra que também travasse o botão seria uma regra de senha
 * que existe só na tela — e o primeiro script que falasse direto com a API não a conheceria.
 * Regra que vale é regra que o servidor confere; o resto é ajuda, e ajuda não tranca porta.
 *
 * Os quatro critérios são os de sempre porque são os que o atacante enfrenta: comprimento
 * multiplica o custo de varrer o espaço inteiro, e cada classe de caractere a mais o
 * multiplica de novo. Nenhum deles sozinho salva uma senha ruim — `Senha123!` cumpre três.
 */
export const STRENGTH_LENGTH = 12;

export type StrengthRule = 'length' | 'number' | 'symbol' | 'mixedCase';

export type StrengthLevel = 'none' | 'weak' | 'fair' | 'good' | 'strong';

export type PasswordStrength = {
  /* Quantos critérios a senha cumpre, de 0 a 4 — é quantos blocos a barra pinta. */
  score: number;
  level: StrengthLevel;
  met: Record<StrengthRule, boolean>;
};

const RULES: Record<StrengthRule, (password: string) => boolean> = {
  length: (password) => password.length >= STRENGTH_LENGTH,
  number: (password) => /\d/.test(password),
  /* Qualquer coisa que não seja letra, número ou espaço. A lista fechada de símbolos deixava
     de fora acento e cedilha, e uma senha em português é escrita com eles. */
  symbol: (password) => /[^\p{L}\p{N}\s]/u.test(password),
  mixedCase: (password) => /\p{Ll}/u.test(password) && /\p{Lu}/u.test(password),
};

const LEVELS: StrengthLevel[] = ['none', 'weak', 'fair', 'good', 'strong'];

export function toPasswordStrength(password: string): PasswordStrength {
  const met = {
    length: RULES.length(password),
    number: RULES.number(password),
    symbol: RULES.symbol(password),
    mixedCase: RULES.mixedCase(password),
  };

  /* Senha vazia não é fraca, é inexistente: a barra fica cinza e o rótulo, num traço. Pintar
     um bloco vermelho antes do primeiro caractere é acusar quem ainda não digitou nada. */
  if (password.length === 0) return { score: 0, level: 'none', met };

  const score = Object.values(met).filter(Boolean).length;

  return { score, level: LEVELS[score] ?? 'none', met };
}

/** O texto em português que vai embaixo da barra. */
export const STRENGTH_LABELS: Record<StrengthLevel, string> = {
  none: '—',
  weak: 'Fraca',
  fair: 'Razoável',
  good: 'Boa',
  strong: 'Forte',
};

/**
 * O que cada critério diz na tela. O do comprimento cita o número que a barra usa (12), e
 * não o mínimo que o servidor aceita (8) — são coisas diferentes, e a tela diz as duas: o
 * campo recusa abaixo de 8, esta lista sugere 12.
 */
export const STRENGTH_HINTS: Record<StrengthRule, string> = {
  length: `Pelo menos ${STRENGTH_LENGTH} caracteres`,
  number: 'Tem número',
  symbol: 'Tem símbolo',
  mixedCase: 'Tem maiúscula e minúscula',
};

export const STRENGTH_RULES: StrengthRule[] = ['length', 'number', 'symbol', 'mixedCase'];

/** O mínimo que o servidor aceita, repetido aqui para a tela poder dizê-lo antes do envio. */
export const MINIMUM_LENGTH = MIN_PASSWORD_LENGTH;
