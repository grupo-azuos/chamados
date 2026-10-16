/**
 * OS DEPARTAMENTOS DA EMPRESA — uma lista, para o sistema inteiro.
 *
 * Ela mora aqui, e não dentro da feature que a usou primeiro, porque mais de uma precisa dela:
 * um chamado é aberto por um departamento e um computador pertence a um departamento. Com uma
 * cópia em cada feature, a primeira reorganização da empresa deixaria as duas discordando — e
 * os indicadores que cruzam chamado com máquina passariam a somar departamentos diferentes
 * como se fossem o mesmo.
 *
 * São nomes próprios da empresa: não se traduzem. A chave é a versão sem acento e em minúscula
 * do próprio nome, para caber em coluna e URL sem escapar nada.
 *
 * Departamento novo? Acrescente aqui e rode `npm run db:generate`: as checagens do banco são
 * geradas desta mesma lista, então formulário e Postgres nunca discordam.
 */
export const DEPARTMENTS = [
  'analyze',
  'certificado',
  'comercial',
  'contabil',
  'cs',
  'financeiro',
  'fiscal',
  'paralegal',
  'pessoal',
  'recepcao',
  'rh',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  analyze: 'ANALYZE',
  certificado: 'CERTIFICADO',
  comercial: 'COMERCIAL',
  contabil: 'CONTÁBIL',
  cs: 'CS',
  financeiro: 'FINANCEIRO',
  fiscal: 'FISCAL',
  paralegal: 'PARALEGAL',
  pessoal: 'PESSOAL',
  recepcao: 'RECEPÇÃO',
  rh: 'RH',
};

export function departmentLabel(department: Department): string {
  return DEPARTMENT_LABELS[department];
}

export function isDepartment(value: unknown): value is Department {
  return typeof value === 'string' && (DEPARTMENTS as readonly string[]).includes(value);
}

/** As opções na ordem em que aparecem no `select`, já com o rótulo pronto. */
export function departmentOptions(): { value: Department; label: string }[] {
  return DEPARTMENTS.map((value) => ({ value, label: DEPARTMENT_LABELS[value] }));
}

/**
 * O departamento da lista a partir do TEXTO que vem do admin-console (lá ele é livre: "Contábil",
 * "Departamento Pessoal", "RH"…).
 *
 * Compara sem acento, sem caixa e sem espaço sobrando, contra o valor e o rótulo de cada um, e
 * aceita o nome do departamento dentro de um texto maior ("Depto. Fiscal"). Sem um encontro
 * único, devolve `null`: escolher um departamento por chute colocaria o chamado na estatística
 * errada — melhor a pessoa escolher.
 */
export function departmentFromText(text: string | null | undefined): Department | null {
  const wanted = normalize(text);
  if (!wanted) return null;

  const exact = DEPARTMENTS.find((department) => keysOf(department).includes(wanted));
  if (exact) return exact;

  const inside = DEPARTMENTS.filter((department) =>
    keysOf(department).some((key) => new RegExp(`\\b${key}\\b`).test(wanted)),
  );

  return inside.length === 1 ? (inside[0] ?? null) : null;
}

function keysOf(department: Department): string[] {
  return [normalize(department), normalize(DEPARTMENT_LABELS[department])];
}

function normalize(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
