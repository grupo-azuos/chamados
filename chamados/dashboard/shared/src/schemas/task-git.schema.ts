import { z } from 'zod';

import { projectMapBranchSchema, projectMapCommitSchema } from './project-map.schema';

/**
 * O GIT DA TAREFA DE SISTEMA — o sistema do chamado dela, o git graph dele e as branches, com as
 * DESTA tarefa marcadas (`isOfTask`: o nome leva a tarefa, o chamado ou a issue — ver
 * `isTaskBranch`). Sem chamado com sistema, `project` é nulo e o resto vem vazio.
 */
export const taskGitSchema = z.object({
  project: z
    .object({ id: z.number().int(), name: z.string(), repositoryUrl: z.string() })
    .nullable(),
  commits: z.array(projectMapCommitSchema),
  branches: z.array(projectMapBranchSchema.extend({ isOfTask: z.boolean() })),
});

export type TaskGit = z.infer<typeof taskGitSchema>;
