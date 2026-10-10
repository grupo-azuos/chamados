import { type TicketArea } from './ticket-catalog.util';

/**
 * O CONVITE DE CHAMADO — o que vai dentro do link que o bot manda a quem escreve `/chamado`.
 *
 * O link abre o formulário de sempre já sabendo com quem a pessoa quer falar e qual é o
 * telefone dela. Quem monta e ASSINA o convite é o servidor; aqui fica só a forma dele e as
 * contas que a tela e o servidor fazem igual.
 */
export type TicketInvite = {
  /** O responsável: o dono do número para o qual a pessoa escreveu. */
  assignee: { id: string; name: string };
  /** As áreas que ele atende. Com uma só, o formulário já abre nela. */
  areas: TicketArea[];
  /** O telefone de quem escreveu, só dígitos com DDI. Nulo quando o WhatsApp não o informou. */
  phone: string | null;
};

/** O nome do parâmetro do link: `/support?convite=…`. */
export const TICKET_INVITE_PARAM = 'convite';

/** Por quanto tempo o link vale. Curto de propósito: é para abrir agora, não para guardar. */
export const TICKET_INVITE_TTL_MINUTES = 30;

const BRAZIL_COUNTRY_CODE = '55';
/* Com o DDI do Brasil: 12 dígitos é fixo (ou celular antigo), 13 é celular. */
const BRAZIL_LENGTHS: readonly number[] = [12, 13];

/**
 * O telefone do convite, do jeito que o campo do formulário espera: DDD e número, sem o DDI.
 * Número de outro país fica como veio — tirar dígitos dele daria um telefone que não existe.
 */
export function invitePhoneForForm(phone: string | null | undefined): string {
  if (!phone) return '';

  const isBrazilian = phone.startsWith(BRAZIL_COUNTRY_CODE) && BRAZIL_LENGTHS.includes(phone.length);

  return isBrazilian ? phone.slice(BRAZIL_COUNTRY_CODE.length) : phone;
}
