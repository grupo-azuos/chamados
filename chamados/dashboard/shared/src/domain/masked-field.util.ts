/**
 * O CURSOR DE UM CAMPO QUE SE REESCREVE ENQUANTO SE DIGITA.
 *
 * Todo campo com máscara tem o mesmo defeito escondido: a máscara reescreve a string
 * inteira, o React repinta o campo, e o cursor vai para o fim. Quem está corrigindo um
 * caractere no MEIO digita uma vez, vê o cursor pular, e passa a apagar tudo para redigitar.
 *
 * A correção é sempre a mesma: contar POSIÇÕES DE CONTEÚDO em vez de caracteres. O cursor
 * volta depois do n-ésimo caractere que sobreviveu à normalização, e a pontuação ao redor
 * deixa de deslocá-lo.
 *
 * Mora aqui, e não dentro de cada campo, porque é a segunda vez que aparece — CNPJ e
 * inscrição municipal — e a terceira vem. Escrita duas vezes, uma das cópias recebe a
 * próxima correção e a outra não.
 */

export type MaskedFieldInput = {
  /** O texto que está no campo depois da tecla. */
  value: string;
  /** Onde o cursor está. `null`/ausente quando quem chama não tem como saber. */
  selectionStart?: number | null;
};

export type MaskedFieldResult = {
  /** O que o campo deve exibir. */
  value: string;
  /** Só o conteúdo, sem pontuação. É isto que vai para o formulário e para a API. */
  raw: string;
  /** Onde o cursor deve ficar depois que a máscara reescreveu o campo. */
  selectionStart: number;
};

/**
 * Aplica a normalização e a máscara de um campo, devolvendo também onde pôr o cursor.
 *
 * Função pura de propósito — sem evento, sem DOM, sem React. Assim ela é testável sem montar
 * componente, e o mesmo comportamento serve a qualquer campo mascarado.
 */
export function applyMaskedInput(
  input: MaskedFieldInput,
  normalize: (value: string) => string,
  format: (normalized: string) => string,
  anchor: CursorAnchor = 'start',
): MaskedFieldResult {
  const raw = normalize(input.value);
  const value = format(raw);
  const selectionStart =
    anchor === 'end'
      ? cursorBeforeContent(value, contentAfter(input))
      : cursorAfterContent(value, contentBefore(input, normalize));

  return { value, raw, selectionStart };
}

/**
 * De que lado o cursor se ancora. `start` conta o conteúdo ANTES dele (CPF, CEP: o texto cresce
 * para a direita). `end` conta o conteúdo DEPOIS dele: é o do dinheiro, que se digita da direita
 * para a esquerda — "5" vira "0,05", e o zero que a máscara pôs na frente empurrava o cursor
 * para antes da vírgula; o próximo dígito entrava no meio do número.
 */
export type CursorAnchor = 'start' | 'end';

/** Quantas posições de conteúdo existem DEPOIS do cursor, ignorando a pontuação. */
function contentAfter(input: MaskedFieldInput): number {
  if (input.selectionStart === null || input.selectionStart === undefined) return 0;

  return input.value.slice(input.selectionStart).replace(SEPARATORS_ALL, '').length;
}

/** A posição, no texto já mascarado, que deixa `count` posições de conteúdo à sua direita. */
function cursorBeforeContent(masked: string, count: number): number {
  if (count <= 0) return masked.length;

  let seen = 0;
  for (let index = masked.length - 1; index >= 0; index -= 1) {
    if (!SEPARATORS.test(masked[index] as string)) seen += 1;
    if (seen >= count) return index;
  }

  return 0;
}

/** Quantas posições de conteúdo existem antes do cursor, ignorando a pontuação. */
function contentBefore(input: MaskedFieldInput, normalize: (value: string) => string): number {
  /* Sem cursor informado, o lugar honesto é o fim: é onde ele está quando se digita, e é o
     único palpite que nunca move o cursor de quem estava no meio — porque não havia um. */
  if (input.selectionStart === null || input.selectionStart === undefined) {
    return Number.POSITIVE_INFINITY;
  }

  return normalize(input.value.slice(0, input.selectionStart)).length;
}

/**
 * A posição, no texto já mascarado, logo depois da n-ésima posição de conteúdo.
 *
 * Conteúdo é tudo que NÃO é separador. Perguntar "é letra ou número?" quebraria no dia em
 * que um campo aceitasse outro alfabeto; perguntar pelo separador mantém a regra do lado que
 * a máscara controla.
 */
function cursorAfterContent(masked: string, count: number): number {
  if (count === Number.POSITIVE_INFINITY) return masked.length;
  if (count <= 0) return 0;

  let seen = 0;
  for (let index = 0; index < masked.length; index += 1) {
    if (!SEPARATORS.test(masked[index] as string)) seen += 1;
    if (seen >= count) return index + 1;
  }

  return masked.length;
}

/* A vírgula entrou com o campo de dinheiro ("1.234,56"): sem ela aqui, ela contava como
   conteúdo e o cursor parava uma posição antes do fim — o próximo dígito entrava no meio. */
const SEPARATORS = /[.,\-/\s]/;
const SEPARATORS_ALL = /[.,\-/\s]/g;
