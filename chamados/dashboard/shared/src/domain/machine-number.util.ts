import { type ComputerKind } from './computer-kind.util';
import { isSameDepartment } from './department.util';

/**
 * O NÚMERO DA MÁQUINA — o "07" de "PARALEGAL-D07" e de "Computador 07".
 *
 * O parque é numerado por departamento e por tipo: em cada departamento há o Computador 01, o
 * 02… e, à parte, o Notebook 01, o 02… O nome físico (o que o Windows mostra) repete o número:
 * ANALYZE-D01 é o "Computador 01" da Analyze, ANALYZE-N01 é o "Notebook 01". Duas coisas saem
 * daqui: a ORDEM da lista e o APELIDO sugerido no cadastro.
 */

/** O que a regra precisa saber de uma máquina — a lista e o cadastro têm formas diferentes. */
export type NumberedMachine = {
  name: string;
  displayName?: string | null;
  hostname?: string | null;
  department?: string | null;
  kind?: ComputerKind | null;
};

/* `numeric`: "PARALEGAL-D2" antes de "PARALEGAL-D10", como a pessoa conta. `base`: maiúscula e
   acento não separam "COMPUTADOR 02" de "Computador 02". */
const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

/** O nome físico — o que a máquina informa —, ou o cadastrado enquanto ela não conectou. */
export function physicalNameOf(machine: NumberedMachine): string {
  return machine.hostname?.trim() || machine.name;
}

/**
 * O nome físico NO PADRÃO do parque: o departamento, o tipo (D desktop, N notebook) e o número
 * — PARALEGAL-D05, ANALYZE-N01. O nome que o Windows inventa (DESKTOP-1IR1609) não está no
 * padrão, e o número dele não é o da máquina.
 */
const PATTERNED_PHYSICAL_NAME = /^[\p{L}0-9]+(?:[-_ ][\p{L}0-9]+)*-[DN](\d+)$/iu;

/**
 * O NÚMERO da máquina: o do nome físico quando ele está no padrão; senão, o do apelido
 * ("Computador 01" → 1). Nulo quando nenhum dos dois traz número.
 */
export function machineNumberOf(machine: NumberedMachine): number | null {
  return patternedNumberOf(machine) ?? trailingNumberOf(machine.displayName);
}

/** O número do nome físico, SÓ quando ele está no padrão do parque. */
function patternedNumberOf(machine: NumberedMachine): number | null {
  const physical = physicalNameOf(machine).trim().match(PATTERNED_PHYSICAL_NAME);

  return physical?.[1] ? Number(physical[1]) : null;
}

/* A palavra do grupo quando o apelido não tem uma: o tipo cadastrado. */
const KIND_WORD: Record<ComputerKind, string> = { desktop: 'computador', notebook: 'notebook' };

/**
 * O GRUPO da máquina na ordem — "computador" ou "notebook", como a pessoa a vê: a palavra do
 * apelido ("Notebook 01"); sem ela, a letra do nome físico no padrão (D ou N); por último, o
 * tipo cadastrado. Há notebook cadastrado como desktop, e pelo tipo ele cairia no meio dos
 * computadores.
 */
/** A palavra do apelido, sem acento e minúscula: "Notebook 01" e "Notebook" dão "notebook". */
function nicknameWordOf(displayName: string | null | undefined): string | null {
  const word =
    nicknameParts(displayName)?.word ?? displayName?.trim().match(/^(computador|notebook)\b/i)?.[1];

  return word ? word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase() : null;
}

function groupOf(machine: NumberedMachine): string {
  const word = nicknameWordOf(machine.displayName);
  if (word) return word;

  const letter = physicalNameOf(machine).trim().match(/-([DN])\d+$/i)?.[1]?.toUpperCase();
  if (letter) return letter === 'N' ? 'notebook' : 'computador';

  return KIND_WORD[machine.kind ?? 'desktop'];
}

/**
 * A ORDEM do inventário, PELO NÚMERO da máquina: computadores primeiro, depois notebooks (pelo
 * grupo que a pessoa vê, `groupOf`), e em cada grupo o 01, o 02, o 03… — de qualquer
 * departamento, que desempata. Máquina sem número
 * (nem no nome físico no padrão, nem no apelido) vai para o fim. O apelido e o nome físico
 * desempatam o resto, para a ordem nunca mudar a cada leitura.
 */
export function compareMachines(a: NumberedMachine, b: NumberedMachine): number {
  const keysA = sortKeysOf(a);
  const keysB = sortKeysOf(b);
  for (let index = 0; index < keysA.length; index++) {
    const order = compareKey(keysA[index], keysB[index]);
    if (order !== 0) return order;
  }

  return 0;
}

/** As chaves da ordem, da mais forte para a mais fraca: grupo, número, departamento, nomes. */
function sortKeysOf(machine: NumberedMachine): (number | string)[] {
  return [
    groupOf(machine),
    machineNumberOf(machine) ?? Number.POSITIVE_INFINITY,
    machine.department?.trim() ?? '',
    machine.displayName?.trim() ?? '',
    physicalNameOf(machine),
  ];
}

function compareKey(a: number | string | undefined, b: number | string | undefined): number {
  if (typeof a === 'number' && typeof b === 'number') return a === b ? 0 : a < b ? -1 : 1;

  return collator.compare(String(a ?? ''), String(b ?? ''));
}

/** O número no FIM do texto: "PARALEGAL-D05" → 5, "Computador 06" → 6. Sem número, nulo. */
export function trailingNumberOf(text: string | null | undefined): number | null {
  const match = text?.trim().match(/(\d+)$/);

  return match ? Number(match[1]) : null;
}

/** "Computador 06" → { word: "Computador", digits: "06" }. Apelido sem número no fim: nulo. */
function nicknameParts(displayName: string | null | undefined) {
  const match = displayName?.trim().match(/^(.*\S)\s+(\d+)$/);

  return match ? { word: match[1] ?? '', digits: match[2] ?? '' } : null;
}

/**
 * O APELIDO SUGERIDO para a máquina nova de um departamento e tipo: o mesmo formato que as
 * máquinas dali já usam, com o próximo número. Paralegal com até "Computador 06" → "Computador 07".
 *
 * O número é o MAIOR já usado mais um — no apelido ou no nome físico —, e não o primeiro vago:
 * reaproveitar o número de uma máquina arquivada faria duas fichas com o mesmo nome no histórico.
 *
 * Departamento sem máquina daquele tipo, ou cujas máquinas não seguem o padrão "Palavra NN":
 * não há o que copiar, e a resposta é nula — o campo fica como a pessoa deixou.
 */
export function suggestNickname(
  machines: readonly NumberedMachine[],
  department: string,
  kind: ComputerKind,
): string | null {
  const same = machines.filter(
    (machine) => machine.kind === kind && isSameDepartment(machine.department, department),
  );
  const named = same
    .map((machine) => nicknameParts(machine.displayName))
    .filter((parts) => parts !== null);
  if (named.length === 0) return null;

  /* O nome físico só conta no padrão: o "1609" de DESKTOP-1IR1609 não é número de máquina. */
  const numbers = same.flatMap((machine) => [
    trailingNumberOf(machine.displayName),
    patternedNumberOf(machine),
  ]);
  const highest = Math.max(...numbers.filter((number) => number !== null));
  /* A palavra e a largura vêm do apelido de número mais alto: é o padrão mais recente. */
  const model = named.reduce((best, parts) =>
    Number(parts.digits) > Number(best.digits) ? parts : best,
  );

  return `${model.word} ${String(highest + 1).padStart(model.digits.length, '0')}`;
}
