/**
 * OS DEPARTAMENTOS DA EMPRESA — quem diz quais existem é o RH.
 *
 * A lista mora no sistema de Gestão de RH (a lista "Departamentos" dos cadastros de apoio), e
 * o servidor a lê de lá (`modules/departments`). Departamento novo ou renomeado no RH aparece
 * aqui sozinho, sem código: uma cópia escrita neste arquivo ficaria para trás na primeira
 * reorganização, e os indicadores que cruzam chamado com máquina passariam a somar nomes que o
 * resto da empresa já não usa.
 *
 * O que se GUARDA é o nome, como o RH o escreve ("Contábil", "Departamento Pessoal"). É o mesmo
 * jeito do RH guardar o departamento do colaborador: renomear lá não reescreve o que já foi
 * gravado aqui, e um nome antigo continua legível no chamado de ontem.
 */

/** O nome mais comprido aceito — folga para qualquer departamento real. */
export const DEPARTMENT_NAME_MAX_LENGTH = 120;

export type Department = string;

/**
 * Os departamentos que existem SÓ AQUI, sem par na lista do RH. Continuam escolhíveis, abaixo
 * dos do RH e separados por uma linha: quem os usa sabe o que são, mas eles não são da lista
 * oficial.
 */
export const LOCAL_DEPARTMENTS = ['ANALYZE', 'CERTIFICADO', 'RECEPÇÃO'] as const;

/**
 * Os códigos que o sistema guardava antes de a lista vir do RH, e o nome que cada um virou.
 *
 * A migration troca os dados gravados por estes nomes; o mapa fica aqui para a tela ainda ler
 * certo um código antigo que chegue de algum lugar (um relatório velho, um teste) em vez de
 * mostrar "contabil" cru.
 */
export const LEGACY_DEPARTMENT_NAMES: Readonly<Record<string, string>> = {
  analyze: 'ANALYZE',
  certificado: 'CERTIFICADO',
  comercial: 'Comercial',
  contabil: 'Contábil',
  cs: 'Experiência do Cliente',
  financeiro: 'Financeiro',
  fiscal: 'Fiscal',
  paralegal: 'Paralegal',
  pessoal: 'Departamento Pessoal',
  recepcao: 'RECEPÇÃO',
  rh: 'Recursos Humanos',
};

/** O nome para a tela. Gravado já é o nome; só um código antigo precisa de tradução. */
export function departmentLabel(department: Department): string {
  return LEGACY_DEPARTMENT_NAMES[department] ?? department;
}

/** Os departamentos que se podem escolher: os do RH e, depois, os que existem só aqui. */
export type DepartmentCatalog = { rh: readonly string[]; local: readonly string[] };

export type DepartmentChoice = { value: Department; label: string; separatorBefore?: boolean };

/**
 * As opções do seletor, na ordem em que aparecem: as do RH primeiro e as daqui depois de uma
 * linha divisória.
 *
 * O departamento daqui que o RH passar a ter some do grupo de baixo — a mesma opção duas vezes
 * faria a pessoa escolher uma e o relatório contar as duas como diferentes.
 */
export function departmentChoices(catalog: DepartmentCatalog): DepartmentChoice[] {
  const official = new Set(catalog.rh.map(normalize));
  const extra = catalog.local.filter((name) => !official.has(normalize(name)));

  return [
    ...catalog.rh.map((name) => ({ value: name, label: name })),
    ...extra.map((name, index) => ({ value: name, label: name, separatorBefore: index === 0 })),
  ];
}

/**
 * As opções com o valor ATUAL garantido no fim: uma máquina gravada com um departamento que o RH
 * já tirou abre a edição mostrando o que ela tem, e não "Selecione" — senão salvar sem tocar no
 * campo pareceria apagar o departamento.
 */
export function withCurrentDepartment(
  choices: readonly DepartmentChoice[],
  current: Department | null | undefined,
): DepartmentChoice[] {
  if (!current || choices.some((choice) => choice.value === current)) return [...choices];

  return [...choices, { value: current, label: departmentLabel(current), separatorBefore: true }];
}

/** Todos os nomes escolhíveis, sem o agrupamento — para quem só precisa comparar. */
export function departmentNames(catalog: DepartmentCatalog): Department[] {
  return departmentChoices(catalog).map((choice) => choice.value);
}

/**
 * O departamento da lista a partir do TEXTO que vem do admin-console (lá ele é livre:
 * "Contábil", "Depto. Fiscal", "RH"…).
 *
 * Compara sem acento, sem caixa e sem espaço sobrando, e aceita o nome dentro de um texto maior
 * ("Depto. Fiscal"). Sem um encontro único, devolve `null`: escolher um departamento por chute
 * colocaria o chamado na estatística errada — melhor a pessoa escolher.
 */
export function departmentFromText(
  text: string | null | undefined,
  names: readonly Department[],
): Department | null {
  const wanted = normalize(text);
  if (!wanted) return null;

  const exact = names.find((name) => normalize(name) === wanted);
  if (exact) return exact;

  const inside = names.filter((name) => new RegExp(`\\b${escapeRegExp(normalize(name))}\\b`).test(wanted));

  return inside.length === 1 ? (inside[0] ?? null) : null;
}

function normalize(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
