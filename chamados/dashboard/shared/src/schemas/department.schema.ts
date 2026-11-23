import { z } from 'zod';

import { DEPARTMENT_NAME_MAX_LENGTH } from '../domain/department.util';

/**
 * O departamento como campo de formulário e de API: o NOME, como o RH o escreve.
 *
 * O schema não confere se o nome está na lista do RH — a lista muda sem código, e um chamado
 * antigo com um departamento que o RH já tirou precisa continuar válido. Quem oferece as opções
 * é a tela, a partir do catálogo (`GET /departments`).
 */
export function departmentNameSchema(requiredMessage: string) {
  return z
    .string({ error: requiredMessage })
    .trim()
    .min(1, requiredMessage)
    .max(DEPARTMENT_NAME_MAX_LENGTH, `O departamento pode ter até ${DEPARTMENT_NAME_MAX_LENGTH} caracteres`);
}

/**
 * O catálogo que a tela recebe: os departamentos do RH e os que existem só aqui.
 *
 * `isRhAvailable` falso quer dizer que o RH não respondeu e não há lista guardada: a tela
 * oferece só os daqui, e o aviso explica por quê — lista curta calada pareceria um RH vazio.
 */
export const departmentOptionSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

/**
 * O departamento OFICIAL como campo de API: o ID do item na lista "Departamentos" do RH. É o que
 * o computador guarda — o nome muda no RH sem reescrever nada aqui.
 */
export const departmentIdSchema = z
  .number({ error: 'Escolha um departamento da lista' })
  .int('Escolha um departamento da lista')
  .positive('Escolha um departamento da lista');

export const departmentCatalogSchema = z.object({
  rh: z.array(z.string()),
  /** Os mesmos de `rh`, com o id do RH — é o id que o computador guarda. */
  rhOptions: z.array(departmentOptionSchema),
  local: z.array(z.string()),
  isRhAvailable: z.boolean(),
});

export type DepartmentCatalogResponse = z.infer<typeof departmentCatalogSchema>;
