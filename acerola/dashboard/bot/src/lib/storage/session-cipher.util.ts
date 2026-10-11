import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

/**
 * Cifra um valor com AES-256-GCM. O GCM, além de esconder, ASSINA: um arquivo adulterado em
 * disco falha ao abrir, em vez de virar uma conexão corrompida que o WhatsApp recusaria sem
 * dizer por quê.
 *
 * O formato é `iv.assinatura.conteudo`, cada parte em base64url — o mesmo do servidor.
 */
export function encryptSessionValue(value: string, hexKey: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(hexKey, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);

  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptSessionValue(value: string, hexKey: string): string {
  const [iv, tag, encrypted] = value.split('.');
  if (!iv || !tag || encrypted === undefined) throw new Error('Invalid encrypted session value');

  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(hexKey, 'hex'),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
