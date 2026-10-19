import { ensure, isText } from './validation.util.mjs';

export const NOTICE_VERSION = '2026-10-19.1';

function governanceDetails(privacy) {
  const fields = [
    ['controller', 'Responsável pelos dados'],
    ['contact', 'Contato para seus direitos'],
    ['lawful_basis', 'Base legal documentada'],
    ['retention_policy', 'Prazo e regra de conservação'],
  ];

  return fields.map(([key, label]) => `${label}: ${privacy?.[key] ?? 'pendente de definição pela empresa'}.`);
}

export function privacyNotice(registry) {
  const privacy = registry.privacy;
  const approved = privacy?.governance_status === 'approved';
  const visibility = privacy?.repository_visibility === 'public' ? 'público' : 'restrito, conforme permissões do GitHub';

  return [
    `Aviso de privacidade das métricas — versão ${NOTICE_VERSION}`,
    `Projeto: ${registry.repository}. Repositório ${visibility}; confirme a visibilidade real antes de registrar dados.`,
    `Finalidade proposta: ${privacy?.purpose ?? 'pendente de definição pela empresa'}.`,
    'As métricas relacionam entregas, ferramentas de IA e intervenções a um código aleatório e ao papel da pessoa. O histórico de commits e PRs pode identificar você: esse código não garante anonimato.',
    'Nome, e-mail, departamento e experiência são opcionais. Você não precisa fornecer esses dados nem ter conta no GitHub para trabalhar. Não envie documentos, dados sensíveis ou respostas do formulário do RH para as métricas.',
    'O repositório e seu histórico são acessíveis a quem tem suas permissões; em repositório público, qualquer pessoa pode acessar. GitHub e a ferramenta de IA utilizada podem processar informações conforme seus serviços e contratos, inclusive fora do Brasil; a empresa deve revisar os mecanismos aplicáveis.',
    'Nome/e-mail opcionais só podem ser gravados em repositório privado com governança aprovada e pedido específico seu. Um commit permanece no histórico, clones e backups; retirar o campo atual não apaga essas cópias.',
    ...governanceDetails(privacy),
    'Você pode pedir informações, acesso, correção e demais direitos aplicáveis, incluindo eliminação nas hipóteses legais. A empresa deve avaliar cada pedido e os limites de conservação, sem prometer apagar todo o histórico.',
    'Relatórios externos dependem de autorização específica da empresa e revisão de agregação e risco de identificação. Este aviso não autoriza publicação identificada nem classificação automática de desempenho.',
    'A apresentação ou ciência deste aviso não é consentimento, contrato nem autorização ampla de uso dos dados.',
    approved
      ? 'Governança registrada como aprovada pela empresa; isso não equivale a aprovação da ANPD.'
      : 'GOVERNANÇA PENDENTE: este é um aviso provisório. A empresa ainda precisa definir e revisar as condições acima antes de iniciar nova coleta de métricas por participante, ampliar seu uso ou gerar relatórios. O uso de ID também exige base legal.',
  ].join('\n\n');
}

export function validateNoticeReceipt(person, privacy) {
  const receipt = person.notice_receipt;
  if (receipt === undefined) return;
  ensure(privacy?.governance_status === 'approved', 'Notice receipts require approved governance');
  ensure(receipt !== null && typeof receipt === 'object', 'Notice receipt must be an object');
  ensure(isText(receipt.notice_version), 'Notice receipt requires a version');
  ensure(
    isText(receipt.presented_at) && Number.isFinite(Date.parse(receipt.presented_at)),
    'Notice receipt requires a valid presentation timestamp',
  );
  ensure(receipt.channel === 'agent_chat', 'Notice receipt requires the agent_chat channel');
}
