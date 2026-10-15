import { z } from 'zod';

/**
 * O que a tela precisa saber sobre o login — que NÃO acontece aqui.
 *
 * Quem faz o login é o admin-console, pelo proxy. A tela só precisa do endereço dele, para
 * levar a pessoa à conta dela (trocar senha, foto, sair). `null` quando o servidor não foi
 * configurado com `ADMIN_CONSOLE_LOGIN_URL` — e aí a tela não oferece o atalho.
 */
export const authConfigSchema = z.object({
  accountUrl: z.string().url().nullable(),
});

export type AuthConfig = z.infer<typeof authConfigSchema>;
