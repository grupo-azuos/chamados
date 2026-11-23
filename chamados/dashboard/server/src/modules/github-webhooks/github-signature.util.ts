import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * O AVISO VEIO MESMO DO GITHUB?
 *
 * O GitHub assina o corpo de cada aviso com o segredo do webhook (HMAC-SHA256) e manda a
 * assinatura em `X-Hub-Signature-256: sha256=<hex>`. Recalcular sobre os MESMOS bytes e comparar
 * é a única prova: a porta é pública, e sem isto qualquer um fecharia chamado fingindo ser o
 * GitHub. A comparação é de tempo constante, para não vazar o segredo pela demora.
 */
export function isValidGithubSignature(
  secret: string,
  rawBody: Buffer,
  header: string | undefined,
): boolean {
  if (!header?.startsWith('sha256=')) return false;

  const expected = Buffer.from(
    `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`,
  );
  const received = Buffer.from(header);
  if (received.length !== expected.length) return false;

  return timingSafeEqual(received, expected);
}
