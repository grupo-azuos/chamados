import { COMPUTER_NO_RESPONSIBLE_FILTER } from '@template/shared/schemas/computer.schema';
import { type DirectoryUser } from '@template/shared/schemas/user.schema';

/**
 * O RESPONSÁVEL de uma máquina é a PESSOA do diretório do escritório (admin-console), guardada
 * pelo id. O nome e a foto são lidos de lá na hora; aqui ficam as réguas que traduzem o filtro
 * e a busca da lista para ids.
 */

/**
 * O filtro "Responsável" já traduzido para o que o banco entende:
 * - `none`: as máquinas sem ninguém;
 * - `person`: as dessa pessoa, pelo id.
 */
export type ResponsibleFilter = { kind: 'none' } | { kind: 'person'; id: string };

/**
 * O nome na forma de comparar: sem espaço sobrando e sem diferença de maiúscula. "ana  souza "
 * e "Ana Souza" são a mesma pessoa para quem digitou.
 */
export function normalizePersonName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

/** O filtro pedido na lista. O id vai direto: é ele que o cadastro guarda. */
export function responsibleFilterOf(responsibleId: string | undefined): ResponsibleFilter | undefined {
  if (!responsibleId) return undefined;
  if (responsibleId === COMPUTER_NO_RESPONSIBLE_FILTER) return { kind: 'none' };

  return { kind: 'person', id: responsibleId };
}

/**
 * As pessoas cujo NOME contém o termo da busca livre — a busca acha a máquina pelo nome do
 * responsável, e o banco só conhece o id.
 */
export function peopleMatching(term: string | undefined, people: readonly DirectoryUser[]): string[] {
  const wanted = normalizePersonName(term ?? '');
  if (wanted === '') return [];

  return people.filter((person) => normalizePersonName(person.name).includes(wanted)).map((person) => person.id);
}
