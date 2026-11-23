import { COMPUTER_NO_RESPONSIBLE_FILTER } from '@template/shared/schemas/computer.schema';
import { type DirectoryUser } from '@template/shared/schemas/user.schema';

/**
 * O RESPONSÁVEL de uma máquina ligado à PESSOA do diretório.
 *
 * O cadastro do computador guarda o NOME do responsável (escolhido na lista do escritório, ou
 * digitado nos cadastros antigos), e não o id. A foto e o filtro precisam da pessoa: por isso o
 * nome é casado com o diretório do admin-console aqui, num lugar só — a foto do cartão e o
 * filtro "Responsável" usam a MESMA régua, e a máquina que aparece com a foto da Ana é a mesma
 * que o filtro "Ana" traz.
 */

/** A pessoa achada para um nome: o id (que o filtro guarda) e a foto (que o cartão mostra). */
export type ResponsiblePerson = { id: string; avatarUrl: string | null };

/**
 * O filtro "Responsável" já traduzido para o que o banco entende:
 * - `none`: as máquinas sem ninguém;
 * - `name`: as do nome dessa pessoa (já normalizado por `normalizePersonName`);
 * - `nobody`: a pessoa pedida não existe no diretório — nenhuma máquina, e não todas.
 */
export type ResponsibleFilter =
  | { kind: 'none' }
  | { kind: 'name'; name: string }
  | { kind: 'nobody' };

/**
 * O nome na forma de comparar: sem espaço sobrando e sem diferença de maiúscula. "ana  souza "
 * e "Ana Souza" são a mesma pessoa para quem digitou. O banco aplica a mesma régua
 * (`responsibleCondition` no repository).
 */
export function normalizePersonName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

/**
 * As pessoas do diretório pelo nome normalizado. Nome repetido fica com a primeira ATIVA: a
 * conta bloqueada de alguém que saiu não pode tomar a foto de quem continua.
 */
export function indexPeopleByName(people: readonly DirectoryUser[]): Map<string, ResponsiblePerson> {
  const ordered = [...people].sort((left, right) => Number(Boolean(left.banned)) - Number(Boolean(right.banned)));
  const index = new Map<string, ResponsiblePerson>();
  for (const person of ordered) {
    const key = normalizePersonName(person.name);
    if (key === '' || index.has(key)) continue;
    index.set(key, { id: person.id, avatarUrl: person.image ?? null });
  }

  return index;
}

/** A pessoa do responsável — nula sem responsável ou quando o nome não bate com ninguém. */
export function responsiblePersonOf(
  responsibleName: string | null,
  index: ReadonlyMap<string, ResponsiblePerson>,
): ResponsiblePerson | null {
  if (!responsibleName) return null;

  return index.get(normalizePersonName(responsibleName)) ?? null;
}

/** O filtro pedido na lista, traduzido do id da pessoa para o nome que o cadastro guarda. */
export function responsibleFilterOf(
  responsibleId: string | undefined,
  people: readonly DirectoryUser[],
): ResponsibleFilter | undefined {
  if (!responsibleId) return undefined;
  if (responsibleId === COMPUTER_NO_RESPONSIBLE_FILTER) return { kind: 'none' };

  const person = people.find((candidate) => candidate.id === responsibleId);
  if (!person) return { kind: 'nobody' };

  return { kind: 'name', name: normalizePersonName(person.name) };
}
