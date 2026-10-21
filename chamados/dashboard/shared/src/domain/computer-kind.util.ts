/**
 * O TIPO da máquina: desktop ou notebook.
 *
 * É escolhido no cadastro, e não medido pelo agente: a mesma placa-mãe aparece igual nos dois,
 * e quem sabe se a máquina sai da mesa é o TI. A separação existe porque o notebook roda pela
 * empresa — some da rede, volta em outro departamento —, e quem procura um quer filtrar os dois
 * de forma diferente.
 */

export const COMPUTER_KINDS = ['desktop', 'notebook'] as const;

export type ComputerKind = (typeof COMPUTER_KINDS)[number];

/** A chave é inglês (o usuário não vê); o rótulo é português (vê). */
export const COMPUTER_KIND_LABELS: Record<ComputerKind, string> = {
  desktop: 'Desktop',
  notebook: 'Notebook',
};

export function computerKindLabel(kind: ComputerKind): string {
  return COMPUTER_KIND_LABELS[kind];
}
