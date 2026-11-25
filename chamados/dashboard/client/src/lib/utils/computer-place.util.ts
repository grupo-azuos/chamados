import { type Computer } from '@template/shared/schemas/computer.schema';

/** O que a tela lê de uma máquina para dizer onde ela está e de quem ela é. */
export type ComputerPlace = Pick<Computer, 'departmentId' | 'departmentName'>;

/** O departamento id gravado cujo nome o RH já não tem — dito por extenso, e não o número. */
export const DEPARTMENT_OUT_OF_LIST_LABEL = '(Departamento fora da lista do RH)';

export const NO_DEPARTMENT_LABEL = 'Sem departamento';

export const NO_RESPONSIBLE_LABEL = '(Sem responsável)';

/**
 * O departamento OFICIAL da máquina, como a tela o mostra. O nome vem do RH pelo servidor; um id
 * sem nome é um departamento que saiu da lista, e a tela diz isso em vez de mostrar "Sem".
 */
export function computerDepartmentLabel(computer: ComputerPlace): string {
  if (computer.departmentName) return computer.departmentName;

  return computer.departmentId ? DEPARTMENT_OUT_OF_LIST_LABEL : NO_DEPARTMENT_LABEL;
}

/** O responsável como a tela o mostra: o nome do diretório ou "(Sem responsável)". */
export function computerResponsibleLabel(computer: Pick<Computer, 'responsibleName'>): string {
  return computer.responsibleName ?? NO_RESPONSIBLE_LABEL;
}
