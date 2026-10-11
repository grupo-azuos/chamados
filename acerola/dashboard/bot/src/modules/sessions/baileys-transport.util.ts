import {
  type ConnectionState,
  DisconnectReason,
  type WAMessage,
  makeCacheableSignalKeyStore,
  makeWASocket,
  type WASocket,
} from 'baileys';
import { type Logger } from 'pino';

import { type SessionStore } from '../../lib/storage/session-store.type.js';
import { loadAuthState } from './baileys-auth-state.util.js';
import { ownChatIdsOf, readPrivateText } from './baileys-message.util.js';
import { normalizePhone, phoneFromJid } from './whatsapp-phone.util.js';
import {
  type MessageResponder,
  type SessionStatus,
  type WhatsAppTransport,
} from './whatsapp-transport.type.js';
import {
  DISCONNECTED_STATUS,
  RecipientNotFoundError,
  SessionNotConnectedError,
} from './whatsapp-transport.util.js';

type Session = { socket: WASocket; status: SessionStatus; hasConnected: boolean };

/**
 * Como o bot aparece em "Aparelhos conectados", no celular de quem vinculou.
 *
 * O primeiro item é o NOME que a pessoa lê. O segundo escolhe o ÍCONE, e só entre os que o
 * WhatsApp oferece (Chrome, Firefox, Edge, Safari, computador…) — não existe ícone próprio. O
 * terceiro é a versão, que não aparece.
 *
 * Isto é enviado na hora de ler o QR code: mudar aqui só vale para vínculo NOVO.
 */
const DEVICE_IDENTITY: [string, string, string] = ['Acerola Ticket', 'Chrome', '1.0.0'];

const SENT_IDS_KEPT = 200;

/* Um respiro antes de religar: sem ele, uma queda de rede vira um laço de reconexão, e laço de
   reconexão é o tipo de comportamento que o WhatsApp lê como automação. */
const RECONNECT_DELAY_MS = 5000;

/**
 * O WhatsApp pelo Baileys — a ÚNICA parte do sistema que conhece essa biblioteca.
 *
 * Uma sessão por pessoa vinculada, cada uma com o próprio socket. O estado que o resto enxerga
 * é só o `SessionStatus`; o socket nunca sai daqui.
 */
export function createBaileysTransport(
  store: SessionStore,
  logger: Logger,
  respond: MessageResponder,
): WhatsAppTransport {
  const sessions = new Map<string, Session>();
  let isClosing = false;
  /* Os ids das últimas respostas do bot — ver o laço em `answer`. */
  const sentByBot = new Set<string>();

  function rememberSent(id: string | null | undefined): void {
    if (!id) return;

    sentByBot.add(id);
    /* Só as mais recentes importam: a mais antiga sai para a lista não crescer para sempre. */
    if (sentByBot.size > SENT_IDS_KEPT) sentByBot.delete(sentByBot.values().next().value ?? '');
  }

  async function open(sessionId: string): Promise<Session> {
    const { state, saveCreds } = await loadAuthState(store, sessionId);
    const socket = makeWASocket({
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      logger,
      browser: DEVICE_IDENTITY,
      /* Não aparecer "online" nem puxar o histórico inteiro: o bot só precisa mandar e ouvir. */
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });
    const session: Session = {
      socket,
      status: { state: 'pairing', qr: null, phone: null },
      hasConnected: Boolean(state.creds.me),
    };
    sessions.set(sessionId, session);

    socket.ev.on('creds.update', () => void saveCreds());
    socket.ev.on('connection.update', (update) => void onUpdate(sessionId, session, update));
    /* `notify` é mensagem que acabou de chegar. Os outros tipos são histórico sendo
       sincronizado, e histórico não se responde. */
    socket.ev.on('messages.upsert', ({ messages, type }) => {
      if (type === 'notify') void answer(sessionId, socket, messages);
    });

    return session;
  }

  async function answer(sessionId: string, socket: WASocket, messages: WAMessage[]): Promise<void> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const ownChatIds = ownChatIdsOf(socket.user);

    for (const message of messages) {
      /* Na conversa da pessoa com ela mesma, a resposta do bot também chega como "mensagem
         dela". Sem pular as que o próprio bot mandou, uma resposta que fosse igual a um comando
         faria o bot responder a si mesmo, sem parar. */
      if (sentByBot.has(message.key.id ?? '')) continue;

      const incoming = readPrivateText(message, nowSeconds, ownChatIds);
      const reply = incoming ? await respond({ sessionId, ...incoming }).catch(() => null) : null;
      if (!incoming || !reply) continue;

      /* Uma resposta que falhou não pode derrubar as outras nem o socket. */
      await socket
        .sendMessage(incoming.chatId, { text: reply })
        .then((sent) => rememberSent(sent?.key.id))
        .catch((error: unknown) => logger.error({ error }, 'failed to reply'));
    }
  }

  async function onUpdate(
    sessionId: string,
    session: Session,
    update: Partial<ConnectionState>,
  ): Promise<void> {
    /* Uma sessão substituída (reconexão) ainda pode emitir eventos atrasados: ignorados. */
    if (sessions.get(sessionId) !== session) return;

    if (update.qr) session.status = { state: 'pairing', qr: update.qr, phone: null };
    if (update.connection === 'open') {
      session.hasConnected = true;
      session.status = {
        state: 'connected',
        qr: null,
        phone: phoneFromJid(session.socket.user?.id),
      };
    }
    if (update.connection === 'close') await onClose(sessionId, session, statusCodeOf(update));
  }

  async function onClose(
    sessionId: string,
    session: Session,
    statusCode: number | undefined,
  ): Promise<void> {
    sessions.delete(sessionId);
    if (isClosing) return;

    /* Deslogado pelo próprio celular: a conexão guardada não vale mais nada. */
    if (statusCode === DisconnectReason.loggedOut) return store.clear(sessionId);

    /* Logo depois de ler o QR code o WhatsApp pede um reinício — é parte do vínculo, não queda. */
    const mustRestart = statusCode === DisconnectReason.restartRequired;
    /* QR code que venceu sem ninguém ler: para por aqui. Religar sozinho geraria QR code atrás
       de QR code para uma tela que ninguém está olhando. */
    if (!session.hasConnected && !mustRestart) return store.clear(sessionId);

    setTimeout(() => void reopen(sessionId), mustRestart ? 0 : RECONNECT_DELAY_MS);
  }

  async function reopen(sessionId: string): Promise<void> {
    if (isClosing || sessions.has(sessionId)) return;

    await open(sessionId).catch((error: unknown) =>
      logger.error({ error }, 'failed to reopen session'),
    );
  }

  return {
    async link(sessionId) {
      const session = sessions.get(sessionId) ?? (await open(sessionId));

      return session.status;
    },

    status(sessionId) {
      return sessions.get(sessionId)?.status ?? DISCONNECTED_STATUS;
    },

    async unlink(sessionId) {
      const session = sessions.get(sessionId);
      sessions.delete(sessionId);
      /* Falhar ao avisar o WhatsApp não pode impedir de apagar a conexão guardada. */
      await session?.socket.logout().catch(() => undefined);
      await store.clear(sessionId);
    },

    async sendText(sessionId, to, text) {
      const session = sessions.get(sessionId);
      if (session?.status.state !== 'connected') throw new SessionNotConnectedError();

      const phone = normalizePhone(to);
      if (!phone) throw new RecipientNotFoundError();

      /* Pergunta ao WhatsApp qual é o endereço de verdade do número. No Brasil isso importa:
         o mesmo celular pode estar cadastrado com ou sem o nono dígito. */
      const [recipient] = (await session.socket.onWhatsApp(phone)) ?? [];
      if (!recipient?.exists) throw new RecipientNotFoundError();

      await session.socket.sendMessage(recipient.jid, { text });
    },

    async restore() {
      const stored = await store.list();
      await Promise.all(stored.map((sessionId) => reopen(sessionId)));
    },

    async close() {
      isClosing = true;
      for (const session of sessions.values()) session.socket.end(undefined);
      sessions.clear();
    },
  };
}

/* O motivo da queda vem embrulhado num erro HTTP (Boom); só o código interessa. */
function statusCodeOf(update: Partial<ConnectionState>): number | undefined {
  const error = update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined;

  return error?.output?.statusCode;
}
