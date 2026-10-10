import { DEPARTMENT_LABELS, DEPARTMENTS, type Department } from './department.util';
import {
  TICKET_AREA_LABELS,
  TICKET_PROBLEM_TYPE_LABELS,
  type TicketArea,
  type TicketProblemType,
  ticketProblemTypesForArea,
} from './ticket-catalog.util';

/**
 * ABRIR CHAMADO POR CONVERSA — o formulário que o bot manda e a leitura do que volta.
 *
 * O formulário vai INTEIRO numa mensagem, em tópicos, em vez de uma pergunta por mensagem. É
 * de propósito: cada mensagem automática a mais é um passo na direção do bloqueio do número
 * pelo WhatsApp, e o número é o pessoal de quem atende.
 *
 * Tudo aqui é texto puro, sem WhatsApp nem banco: é a regra da conversa, e ela vale igual no
 * dia em que o transporte for outro.
 */
export type IntakeProject = { id: number; name: string };

export type IntakeContext = {
  area: TicketArea;
  /** Os sistemas que aceitam chamado — só importa na área de Sistema, onde é obrigatório. */
  projects: readonly IntakeProject[];
  /** O telefone de quem escreve, quando o WhatsApp o informou. Sem ele, o formulário pergunta. */
  phone: string | null;
};

export type IntakeData = {
  requesterName: string;
  department: Department;
  problemType: TicketProblemType;
  projectId: number | null;
  contactPhone: string;
  description: string;
};

export type IntakeResult = { ok: true; data: IntakeData } | { ok: false; errors: string[] };

const NAME_MIN_LENGTH = 2;
const DESCRIPTION_MIN_LENGTH = 5;
const PHONE_MIN_DIGITS = 10;

function numbered(labels: readonly string[]): string {
  return labels.map((label, index) => `${index + 1} ${label}`).join(' · ');
}

function needsProject(context: IntakeContext): boolean {
  return context.area === 'sistema';
}

/** As opções numeradas de uma pergunta de área: `1 Infraestrutura`, uma por linha. */
export function buildAreaOptions(areas: readonly TicketArea[]): string {
  return areas.map((area, index) => `${index + 1} ${TICKET_AREA_LABELS[area]}`).join('\n');
}

/** A área que a pessoa escolheu, pelo número ou pelo nome. Nulo quando não deu para entender. */
export function parseAreaChoice(text: string, areas: readonly TicketArea[]): TicketArea | null {
  const byNumber = areas[Number.parseInt(text.trim(), 10) - 1];
  if (byNumber) return byNumber;

  const wanted = normalize(text);

  return areas.find((area) => normalize(TICKET_AREA_LABELS[area]) === wanted) ?? null;
}

/**
 * Os campos do formulário, com as listas numeradas embaixo. As listas começam com "Opções de"
 * — é essa palavra que diz à leitura onde a descrição da pessoa termina.
 */
export function buildIntakeForm(context: IntakeContext): string {
  const types = ticketProblemTypesForArea(context.area);
  const fields = ['Nome: ', 'Setor (número): ', 'Tipo (número): '];
  const options = [
    `Opções de setor: ${numbered(DEPARTMENTS.map((department) => DEPARTMENT_LABELS[department]))}`,
    `Opções de tipo: ${numbered(types.map((type) => TICKET_PROBLEM_TYPE_LABELS[type]))}`,
  ];

  if (needsProject(context)) {
    fields.push('Sistema (número): ');
    options.push(`Opções de sistema: ${numbered(context.projects.map((project) => project.name))}`);
  }
  if (!context.phone) fields.push('Telefone com DDD: ');
  fields.push('Descrição: ');

  return `${fields.join('\n')}\n\n${options.join('\n')}`;
}

type FieldKey = 'name' | 'department' | 'type' | 'project' | 'phone' | 'description';

/* O começo do rótulo, já sem acento e em minúsculas, decide de que campo a linha é. */
const FIELD_PREFIXES: readonly (readonly [string, FieldKey])[] = [
  ['nome', 'name'],
  ['setor', 'department'],
  ['tipo', 'type'],
  ['sistema', 'project'],
  ['telefone', 'phone'],
  ['descri', 'description'],
];
const OPTIONS_PREFIX = 'opc';

const LINE_PATTERN = /^[\s*_]*([^:]{1,40}?)[\s*_]*:(.*)$/;

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[*_~]/g, '').trim().toLowerCase();
}

function fieldOf(label: string): FieldKey | 'options' | null {
  const normalized = normalize(label);
  if (normalized.startsWith(OPTIONS_PREFIX)) return 'options';

  return FIELD_PREFIXES.find(([prefix]) => normalized.startsWith(prefix))?.[1] ?? null;
}

/**
 * Separa o texto nos campos. A descrição é o único campo que pode ter várias linhas: tudo o
 * que vem depois dela, até uma lista de opções ou outro campo, é descrição.
 */
function readFields(text: string): Partial<Record<FieldKey, string>> {
  const fields: Partial<Record<FieldKey, string>> = {};
  let isInDescription = false;

  for (const line of text.split(/\r?\n/)) {
    const match = LINE_PATTERN.exec(line);
    const field = match ? fieldOf(match[1] ?? '') : null;

    if (field === 'options') {
      isInDescription = false;
    } else if (field) {
      fields[field] = (match?.[2] ?? '').trim();
      isInDescription = field === 'description';
    } else if (isInDescription) {
      fields.description = `${fields.description ?? ''}\n${line}`.trim();
    }
  }

  return fields;
}

/** A opção escolhida, pelo número ou pelo nome escrito. */
function pick<T>(
  value: string | undefined,
  options: readonly T[],
  labelOf: (option: T) => string,
): T | null {
  if (!value) return null;

  const byNumber = options[Number.parseInt(value, 10) - 1];
  if (byNumber !== undefined) return byNumber;

  return options.find((option) => normalize(labelOf(option)) === normalize(value)) ?? null;
}

function readPhone(context: IntakeContext, typed: string | undefined): string | null {
  if (context.phone) return context.phone;

  const digits = (typed ?? '').replace(/\D/g, '');

  return digits.length >= PHONE_MIN_DIGITS ? digits : null;
}

type ReadIntake = {
  requesterName: string;
  department: Department | null;
  problemType: TicketProblemType | null;
  project: IntakeProject | null;
  contactPhone: string | null;
  description: string;
};

function readIntake(text: string, context: IntakeContext): ReadIntake {
  const fields = readFields(text);

  return {
    requesterName: (fields.name ?? '').trim(),
    department: pick(fields.department, DEPARTMENTS, (item) => DEPARTMENT_LABELS[item]),
    problemType: pick(
      fields.type,
      ticketProblemTypesForArea(context.area),
      (item) => TICKET_PROBLEM_TYPE_LABELS[item],
    ),
    project: pick(fields.project, context.projects, (item) => item.name),
    contactPhone: readPhone(context, fields.phone),
    description: (fields.description ?? '').trim(),
  };
}

/* Cada regra: o que precisa ser verdade, e o que dizer à pessoa quando não é. */
function problemsOf(read: ReadIntake, context: IntakeContext): string[] {
  const rules: readonly (readonly [boolean, string])[] = [
    [read.requesterName.length >= NAME_MIN_LENGTH, 'Faltou o seu *nome*.'],
    [read.department !== null, 'Não entendi o *setor*: responda com o número da lista.'],
    [read.problemType !== null, 'Não entendi o *tipo*: responda com o número da lista.'],
    [
      !needsProject(context) || read.project !== null,
      'Não entendi o *sistema*: responda com o número da lista.',
    ],
    [read.contactPhone !== null, 'Faltou o *telefone* com DDD.'],
    [read.description.length >= DESCRIPTION_MIN_LENGTH, 'Faltou a *descrição* do problema.'],
  ];

  return rules.filter(([isValid]) => !isValid).map(([, message]) => message);
}

/**
 * Lê o formulário que voltou. Ou sai um chamado completo, ou a lista de TUDO o que falta —
 * de uma vez, para a pessoa corrigir numa mensagem só em vez de em várias rodadas.
 */
export function parseIntakeReply(text: string, context: IntakeContext): IntakeResult {
  const read = readIntake(text, context);
  const errors = problemsOf(read, context);
  const { department, problemType, contactPhone } = read;

  if (errors.length > 0 || !department || !problemType || !contactPhone)
    return { ok: false, errors };

  return {
    ok: true,
    data: {
      requesterName: read.requesterName,
      department,
      problemType,
      projectId: needsProject(context) ? (read.project?.id ?? null) : null,
      contactPhone,
      description: read.description,
    },
  };
}
