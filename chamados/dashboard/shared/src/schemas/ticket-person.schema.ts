import { z } from 'zod';

/**
 * AS PESSOAS DE UM CHAMADO além de quem abriu — o contrato das PESSOAS VINCULADAS.
 *
 * É a "OS com envolvidos" do Tasy: quem abre (ou quem atende) liga ao chamado outras pessoas do
 * admin-console, e elas passam a ver o chamado em "Meus chamados" e a escrever nele. Cada
 * andamento escolhe, na hora, quem dessas pessoas recebe aviso.
 *
 * Mora num arquivo próprio porque o chamado e o histórico usam as mesmas peças, e o histórico
 * não pode importar o chamado (o chamado já importa o histórico).
 */

/** Um id do admin-console: o mesmo teto do id de responsável. */
const PERSON_ID_MAX_LENGTH = 128;

/** Mais que isso é lista de distribuição, não gente envolvida num pedido. */
export const MAX_TICKET_WATCHERS = 20;

/** Uma pessoa como o chamado a mostra: o id (quem é de fato) e o nome (o que se lê). */
export const ticketPersonSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type TicketPerson = z.infer<typeof ticketPersonSchema>;

const personIdSchema = z.string().trim().min(1).max(PERSON_ID_MAX_LENGTH);

/** Os ids das pessoas vinculadas, sem repetir. A repetição some, não vira erro. */
export const watcherIdsSchema = z
  .array(personIdSchema)
  .max(MAX_TICKET_WATCHERS, `Vincule até ${MAX_TICKET_WATCHERS} pessoas`)
  .transform((ids) => [...new Set(ids)]);

/** Trocar a lista de vinculados de um chamado: a lista inteira, como fica. */
export const updateTicketWatchersSchema = z.object({
  userIds: watcherIdsSchema,
});

export type UpdateTicketWatchersInput = z.input<typeof updateTicketWatchersSchema>;

/**
 * Quem recebe AVISO de um andamento — escolhido por quem escreve, a cada andamento. Vazio é
 * "ninguém": avisar é sempre uma escolha, nunca o padrão.
 */
export const notifyUserIdsSchema = z
  .array(personIdSchema)
  .max(MAX_TICKET_WATCHERS + 2)
  .transform((ids) => [...new Set(ids)]);

/**
 * As pessoas de um chamado, como a tela de andamento precisa: quem está VINCULADO (a lista que
 * se edita) e quem pode ser AVISADO de um andamento (quem abriu, os vinculados e o
 * responsável — menos quem está escrevendo).
 */
export const ticketPeopleSchema = z.object({
  watchers: z.array(ticketPersonSchema),
  notifiable: z.array(ticketPersonSchema),
});

export type TicketPeople = z.infer<typeof ticketPeopleSchema>;
