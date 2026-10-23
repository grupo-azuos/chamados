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
 * A ORDEM do inventário: pelo nome físico, com o número em ordem natural (D02 antes de D10).
 * O apelido desempata — duas máquinas com o mesmo nome físico nunca trocam de lugar a cada
 * leitura.
 */
export function compareMachines(a: NumberedMachine, b: NumberedMachine): number {
  return (
    collator.compare(physicalNameOf(a), physicalNameOf(b)) ||
    collator.compare(a.displayName?.trim() ?? '', b.displayName?.trim() ?? '')
  );
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

  const numbers = same.flatMap((machine) => [
    trailingNumberOf(machine.displayName),
    trailingNumberOf(physicalNameOf(machine)),
  ]);
  const highest = Math.max(...numbers.filter((number) => number !== null));
  /* A palavra e a largura vêm do apelido de número mais alto: é o padrão mais recente. */
  const model = named.reduce((best, parts) =>
    Number(parts.digits) > Number(best.digits) ? parts : best,
  );

  return `${model.word} ${String(highest + 1).padStart(model.digits.length, '0')}`;
}
