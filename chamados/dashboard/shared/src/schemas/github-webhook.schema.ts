import { z } from 'zod';

/**
 * A resposta do webhook do GitHub. O GitHub só olha o código HTTP; o `status` é para quem lê o
 * "Recent Deliveries" do App entender o que aconteceu com cada aviso.
 * - `accepted`: era de um sistema cadastrado e foi processado;
 * - `ignored`: chegou certo, mas não há nada a fazer (repositório sem sistema, evento sem uso);
 * - `duplicate`: o GitHub reenviou um aviso que já tinha chegado.
 */
export const githubWebhookResultSchema = z.object({
  status: z.enum(['accepted', 'duplicate', 'ignored']),
});

export type GithubWebhookResultBody = z.infer<typeof githubWebhookResultSchema>;
