import { pino } from 'pino';

import { parseBotEnv } from './config/env.js';
import { replyToMessage } from './conversation/ticket-conversation.js';
import { createBotServer } from './http/bot-server.js';
import { createEncryptedFileStore } from './store/encrypted-file-store.js';
import { createBaileysTransport } from './transport/baileys-transport.js';

async function bootstrap(): Promise<void> {
  const env = parseBotEnv(process.env);
  const logger = pino({ level: env.BOT_LOG_LEVEL });

  const store = createEncryptedFileStore(env.BOT_DATA_DIR, env.BOT_SESSION_KEY);
  /* O Baileys registra muita coisa em `info`, inclusive identificadores de contato. O log dele
     fica um nível acima do nosso: só aviso e erro. */
  const transport = createBaileysTransport(
    store,
    logger.child({ scope: 'baileys' }, { level: 'warn' }),
    replyToMessage,
  );
  const server = createBotServer(transport, env.BOT_API_TOKEN);

  /* Quem já estava vinculado volta a ficar conectado sem ninguém precisar reler QR code. */
  await transport.restore();

  server.listen(env.BOT_PORT, env.BOT_HOST, () => {
    logger.info({ host: env.BOT_HOST, port: env.BOT_PORT }, 'bot listening');
  });

  const shutdown = (): void => {
    server.close();
    void transport.close().finally(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

bootstrap().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
