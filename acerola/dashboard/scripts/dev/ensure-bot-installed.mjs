/**
 * Roda antes do `npm run dev`: deixa o bot de WhatsApp pronto para subir junto.
 *
 * O bot é um pacote à parte (`bot/`), com instalação própria — o `npm install` do painel não
 * instala nada dele, de propósito (ver docs/whatsapp-bot.md). Sem este passo, quem acabou de
 * clonar rodaria `npm run dev` e veria o bot cair por falta de dependência.
 *
 * Também avisa quando falta o `bot/.env`: sem os segredos o bot não sobe, e o resto do sistema
 * continua funcionando normalmente — só o vínculo de WhatsApp fica indisponível.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DASHBOARD_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BOT_DIR = join(DASHBOARD_DIR, 'bot');

if (!existsSync(join(BOT_DIR, 'node_modules'))) {
  process.stdout.write('Instalando as dependências do bot de WhatsApp (só na primeira vez)…\n');
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const install = spawnSync(npm, ['ci'], { cwd: BOT_DIR, stdio: 'inherit' });
  if (install.status !== 0) {
    process.stdout.write(
      '\nNão consegui instalar o bot de WhatsApp. O sistema sobe do mesmo jeito, sem ele.\n',
    );
  }
}

if (!existsSync(join(BOT_DIR, '.env'))) {
  process.stdout.write(
    [
      '',
      'Aviso: bot/.env não existe, então o bot de WhatsApp não vai subir.',
      'O resto do sistema funciona normalmente. Para ligar o bot:',
      '  1. copie bot/.env.example para bot/.env e preencha BOT_API_TOKEN e BOT_SESSION_KEY;',
      '  2. em server/.env, defina BOT_API_URL e o mesmo BOT_API_TOKEN.',
      '',
      '',
    ].join('\n'),
  );
}
