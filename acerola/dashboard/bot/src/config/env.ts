import { z } from 'zod';

/**
 * As variáveis de ambiente do bot, validadas na subida — o mesmo princípio do servidor: valor
 * errado tem que impedir o processo de subir, e não virar um erro obscuro na primeira mensagem.
 */
const envSchema = z.object({
  /** Só a máquina local por padrão: quem fala com o bot é o servidor, nunca a internet. */
  BOT_HOST: z.string().trim().min(1).default('127.0.0.1'),
  BOT_PORT: z.coerce.number().int().min(1).max(65_535).default(3010),
  /**
   * O segredo que o servidor apresenta em toda chamada. Quem tem este valor manda mensagem
   * pelo WhatsApp de qualquer pessoa vinculada — por isso o tamanho mínimo.
   */
  BOT_API_TOKEN: z.string().min(32, 'BOT_API_TOKEN must have at least 32 characters'),
  /** A chave que cifra as conexões guardadas em disco: 32 bytes em hexadecimal. */
  BOT_SESSION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'BOT_SESSION_KEY must be 64 hexadecimal characters'),
  /** Onde as conexões cifradas ficam. Em produção, um volume: perder a pasta é refazer o QR code. */
  BOT_DATA_DIR: z.string().trim().min(1).default('./data'),
  BOT_LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export type BotEnv = z.infer<typeof envSchema>;

export function parseBotEnv(source: Record<string, string | undefined>): BotEnv {
  return envSchema.parse(source);
}
