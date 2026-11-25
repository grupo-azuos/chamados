import { LOCAL_DEPARTMENTS } from '@template/shared/domain/department.util';

import { type ComputerInsert } from '../../../server/src/lib/db/schema/computers.schema';

/**
 * O responsável e o departamento de uma máquina de teste, do JEITO QUE AS MIGRAÇÕES DEIXAM o dado
 * de verdade (0025 e 0027): o seed não conhece os ids do diretório nem do RH desta máquina.
 *
 * Tudo vira linha da observação: "Responsável anterior", "Departamento anterior" e, para os
 * departamentos fixos daqui (ANALYZE, CERTIFICADO, RECEPÇÃO), "Local anterior". Ao subir com o
 * RH respondendo, o sistema casa o departamento oficial pelo nome e grava o id; o responsável se
 * escolhe na tela.
 *
 * Nomes inventados — nenhuma pessoa de verdade entra no seed.
 */
export function seedReferences(
  responsible: string | null,
  department: string | null,
): Pick<ComputerInsert, 'responsibleId' | 'departmentId' | 'notes'> {
  const isFixed = department !== null && (LOCAL_DEPARTMENTS as readonly string[]).includes(department);
  const lines = [
    responsible ? `Responsável anterior: ${responsible}` : null,
    department && isFixed ? `Local anterior: ${department}` : null,
    department && !isFixed ? `Departamento anterior: ${department}` : null,
  ].filter((line): line is string => line !== null);

  return {
    responsibleId: null,
    departmentId: null,
    notes: lines.length > 0 ? lines.join('\n') : null,
  };
}
