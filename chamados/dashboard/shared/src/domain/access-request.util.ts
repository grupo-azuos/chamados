import { z } from 'zod';

import { REQUESTER_NAME_MAX_LENGTH } from '../schemas/ticket.schema';
import { DEPARTMENT_LABELS, DEPARTMENTS, type Department } from './department.util';
import { MIN_PHONE_DIGITS } from './phone.util';

/**
 * PEDIDO DE ACESSO PELO WHATSAPP — a conversa do `/acesso`, sem WhatsApp nem banco.
 *
 * Diferente do `/chamado` (que responde com um link), aqui o bot pergunta UM campo por
 * mensagem: nome completo, e-mail, telefone (só quando o WhatsApp esconde), setor e sistema.
 * Foi a escolha de quem usa: quem pede acesso responde no próprio chat, sem abrir formulário.
 *
 * O rascunho guarda o que já foi respondido; a próxima pergunta é sempre o primeiro campo que
 * falta. Tudo aqui é texto puro — é a regra da conversa, e vale igual se o transporte mudar.
 */

/** O comando que começa o pedido. */
export const ACCESS_REQUEST_COMMAND = '/acesso';

/* Quem quer desistir no meio responde uma destas palavras. */
const CANCEL_WORDS: readonly string[] = ['cancelar', '/cancelar'];

export type AccessRequestStep = 'name' | 'email' | 'phone' | 'department' | 'system';

export type AccessRequestProject = { id: number; name: string };

export type AccessRequestDraft = {
  requesterName: string | null;
  email: string | null;
  /** Só dígitos. Já vem preenchido quando o WhatsApp informa quem escreveu. */
  phone: string | null;
  department: Department | null;
  project: AccessRequestProject | null;
};

export type AccessRequestFill =
  { ok: true; draft: AccessRequestDraft } | { ok: false; error: string };

/* Um "nome" do nome completo: pelo menos duas letras ("de", "da" contam; uma inicial solta não). */
const NAME_PART_MIN_LETTERS = 2;
const NAME_MIN_PARTS = 2;
/* Letras (com acento), espaço, hífen, apóstrofo e ponto: "Maria-Clara D'Ávila Jr." passa. */
const NAME_CHARACTERS = /^[\p{L}\s'’.-]+$/u;
const PHONE_MAX_DIGITS = 13;
const emailSchema = z.string().email();

export function isAccessRequestCommand(text: string): boolean {
  return text.trim().toLowerCase() === ACCESS_REQUEST_COMMAND;
}

export function isAccessRequestCancel(text: string): boolean {
  return CANCEL_WORDS.includes(text.trim().toLowerCase());
}

export function emptyAccessRequest(phone: string | null): AccessRequestDraft {
  return { requesterName: null, email: null, phone, department: null, project: null };
}

/** O próximo campo a perguntar — ou nulo quando o pedido está completo. */
export function nextAccessRequestStep(draft: AccessRequestDraft): AccessRequestStep | null {
  if (!draft.requesterName) return 'name';
  if (!draft.email) return 'email';
  if (!draft.phone) return 'phone';
  if (!draft.department) return 'department';
  if (!draft.project) return 'system';

  return null;
}

/**
 * O nome completo, com os espaços arrumados — ou nulo quando não tem pelo menos dois nomes
 * (nome + sobrenome, ou nome composto).
 */
export function parseFullName(text: string): string | null {
  const name = text.trim().replace(/\s+/g, ' ');
  if (name.length > REQUESTER_NAME_MAX_LENGTH || !NAME_CHARACTERS.test(name)) return null;

  const parts = name.split(' ').filter((part) => lettersIn(part) >= NAME_PART_MIN_LETTERS);

  return parts.length >= NAME_MIN_PARTS ? name : null;
}

function lettersIn(part: string): number {
  return part.replace(/[^\p{L}]/gu, '').length;
}

/** O e-mail em minúsculas — ou nulo quando não é um e-mail. */
export function parseEmail(text: string): string | null {
  const email = text.trim().toLowerCase();

  return emailSchema.safeParse(email).success ? email : null;
}

/** Só os dígitos do telefone — ou nulo quando faltam ou sobram dígitos para um número com DDD. */
export function parsePhone(text: string): string | null {
  const digits = text.replace(/\D/g, '');

  return digits.length >= MIN_PHONE_DIGITS && digits.length <= PHONE_MAX_DIGITS ? digits : null;
}

/* Uma lista NUMERADA do WhatsApp: `1. item`, um por linha — ele a desenha como lista de verdade. */
function numbered(labels: readonly string[]): string {
  return labels.map((label, index) => `${index + 1}. ${label}`).join('\n');
}

export function departmentOptionsText(): string {
  return numbered(DEPARTMENTS.map((department) => DEPARTMENT_LABELS[department]));
}

export function projectOptionsText(projects: readonly AccessRequestProject[]): string {
  return numbered(projects.map((project) => project.name));
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[*_~]/g, '').trim().toLowerCase();
}

/** A opção escolhida, pelo número da lista ou pelo nome escrito. */
function pick<T>(text: string, options: readonly T[], labelOf: (option: T) => string): T | null {
  const byNumber = options[Number.parseInt(text.trim(), 10) - 1];
  if (byNumber !== undefined) return byNumber;

  const wanted = normalize(text);

  return options.find((option) => normalize(labelOf(option)) === wanted) ?? null;
}

type StepRule = (
  draft: AccessRequestDraft,
  text: string,
  projects: readonly AccessRequestProject[],
) => AccessRequestFill;

/* Cada passo: lê a resposta e, se entendeu, devolve o rascunho com o campo preenchido; se não,
   o que dizer — já com o jeito certo de responder, para a pessoa acertar na próxima. */
const STEP_RULES: Record<AccessRequestStep, StepRule> = {
  name: (draft, text) => {
    const requesterName = parseFullName(text);
    if (!requesterName) {
      return fail(
        'Preciso do seu *nome completo*, com pelo menos dois nomes. Ex.: _Maria Clara_ ou _João Silva_.',
      );
    }

    return { ok: true, draft: { ...draft, requesterName } };
  },
  email: (draft, text) => {
    const email = parseEmail(text);
    if (!email) return fail('Esse e-mail não parece certo. Ex.: _maria.silva@empresa.com.br_.');

    return { ok: true, draft: { ...draft, email } };
  },
  phone: (draft, text) => {
    const phone = parsePhone(text);
    if (!phone) return fail('Preciso do *telefone com DDD*. Ex.: _62 99999-0000_.');

    return { ok: true, draft: { ...draft, phone } };
  },
  department: (draft, text) => {
    const department = pick(text, DEPARTMENTS, (item) => DEPARTMENT_LABELS[item]);
    if (!department) {
      return fail(`Não entendi o *setor*. Responda com o número:\n${departmentOptionsText()}`);
    }

    return { ok: true, draft: { ...draft, department } };
  },
  system: (draft, text, projects) => {
    const project = pick(text, projects, (item) => item.name);
    if (!project) {
      return fail(
        `Não entendi o *sistema*. Responda com o número:\n${projectOptionsText(projects)}`,
      );
    }

    return { ok: true, draft: { ...draft, project } };
  },
};

function fail(error: string): AccessRequestFill {
  return { ok: false, error };
}

/** Preenche o campo do passo com a resposta da pessoa. */
export function fillAccessRequestStep(
  draft: AccessRequestDraft,
  step: AccessRequestStep,
  text: string,
  projects: readonly AccessRequestProject[],
): AccessRequestFill {
  return STEP_RULES[step](draft, text, projects);
}

/**
 * A descrição do chamado. O chamado não tem campo de e-mail: ele vai aqui, junto com o resto,
 * para quem atende ter tudo de que precisa para liberar o acesso sem perguntar de novo.
 */
export function accessRequestDescription(request: {
  requesterName: string;
  email: string;
  phone: string;
  projectName: string;
}): string {
  return [
    `Pedido de acesso ao sistema ${request.projectName}, feito pelo WhatsApp (/acesso).`,
    '',
    `Nome: ${request.requesterName}`,
    `E-mail: ${request.email}`,
    `Telefone: ${request.phone}`,
  ].join('\n');
}
