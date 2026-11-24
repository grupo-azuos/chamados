/**
 * A BRANCH DA TAREFA — a do git-flow que leva no nome a tarefa, o chamado ou a issue dela:
 * `feature/tarefa-42-…`, `bugfix/task-42`, `feature/ch-0056-…`, `feature/85-tela` (a issue #85).
 * É o jeito de a página da tarefa de Sistema mostrar "estas são as branches desta tarefa" sem
 * ninguém ter de ligar uma à outra à mão.
 */
export type TaskBranchRefs = {
  taskId: number;
  ticketId: number | null;
  issueNumber: number | null;
};

const SEP = '(?:^|[/_.-])';
const END = '(?=$|[/_.-])';

export function isTaskBranch(name: string, refs: TaskBranchRefs): boolean {
  const lower = name.toLowerCase();
  const patterns = [
    `${SEP}(?:tarefa|task|t)-?${refs.taskId}${END}`,
    ...(refs.ticketId !== null ? [`${SEP}ch-?0*${refs.ticketId}${END}`] : []),
    ...(refs.issueNumber !== null ? [`${SEP}(?:issue-?|gh-?)?${refs.issueNumber}${END}`] : []),
  ];

  return patterns.some((pattern) => new RegExp(pattern).test(lower));
}
