/* Com DDI e DDD, um telefone tem de 10 a 15 dígitos (E.164). */
const PHONE_PATTERN = /^\d{10,15}$/;

/** Só dígitos, ou nulo quando o que veio não é um telefone com DDI. */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');

  return PHONE_PATTERN.test(digits) ? digits : null;
}

/**
 * O número de um identificador do WhatsApp. O formato é `5562999990001:12@s.whatsapp.net`:
 * o que vem depois de `:` é o aparelho, e depois de `@`, o servidor.
 */
export function phoneFromJid(jid: string | null | undefined): string | null {
  if (!jid) return null;

  return normalizePhone(jid.split('@')[0]?.split(':')[0] ?? '');
}
