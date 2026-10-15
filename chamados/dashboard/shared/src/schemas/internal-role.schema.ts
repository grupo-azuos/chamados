import { z } from 'zod';

import { roleContextSchema } from './user.schema';

/**
 * UM MÓDULO LIBERADO PARA UMA PESSOA — Infraestrutura, Sistema ou Manutenção.
 *
 * Não há nível aqui, e é de propósito: o que a pessoa pode DENTRO do módulo vem do papel que
 * o admin-console deu a ela (Administrador mexe em tudo; Gestor e Usuário só veem). Esta linha
 * só diz que o módulo é dela. Ver `domain/module-access.util.ts`.
 *
 * O nome do arquivo e dos tipos (`InternalRole`) ficou o antigo, de quando a linha guardava um
 * cargo por módulo: a rota, a tabela e a tela continuam as mesmas, só o nível saiu.
 */
export const internalRoleSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string().min(1),
  userEmail: z.string().email().nullable().optional(),
  context: roleContextSchema,
  createdAt: z.string().datetime(),
  createdBy: z.string().nullable().optional(),
  updatedAt: z.string().datetime().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
});

export type InternalRole = z.infer<typeof internalRoleSchema>;

/** Liberar um módulo para uma pessoa. Só o super-admin faz isso. */
export const assignRoleSchema = z.object({
  userId: z.string().min(1, 'Escolha a pessoa'),
  userEmail: z.string().email('E-mail inválido').optional().nullable(),
  context: roleContextSchema,
});

export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
