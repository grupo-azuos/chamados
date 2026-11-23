import { computerLocationFromText } from '@template/shared/domain/department.util';

import { type ComputerInsert } from '../../../server/src/lib/db/schema/computers.schema';

/**
 * O responsável e o departamento de uma máquina de teste, do JEITO QUE A MIGRAÇÃO DEIXA o dado
 * de verdade (0025): o seed não conhece os ids do diretório nem do RH desta máquina.
 *
 * - O local fixo (ANALYZE, CERTIFICADO, RECEPÇÃO) vai para `location`.
 * - O responsável e o departamento oficial viram linhas da observação ("Responsável anterior",
 *   "Departamento anterior"). Ao subir com o RH respondendo, o sistema casa o departamento pelo
 *   nome e grava o id; o responsável se escolhe na tela.
 *
 * Nomes inventados — nenhuma pessoa de verdade entra no seed.
 */
export function seedReferences(
  responsible: string | null,
  department: string | null,
): Pick<ComputerInsert, 'responsibleId' | 'departmentId' | 'location' | 'notes'> {
  const location = computerLocationFromText(department);
  const lines = [
    responsible ? `Responsável anterior: ${responsible}` : null,
    department && !location ? `Departamento anterior: ${department}` : null,
  ].filter((line): line is string => line !== null);

  return {
    responsibleId: null,
    departmentId: null,
    location,
    notes: lines.length > 0 ? lines.join('\n') : null,
  };
}
