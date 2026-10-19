import { ensure, isText } from './validation.util.mjs';

export const NOTICE_VERSION = '2026-10-19.2';

function governanceDetails(privacy) {
  const fields = [
    ['controller', 'Responsável pelos dados'],
    ['contact', 'Contato para seus direitos'],
    ['lawful_basis', 'Base legal documentada'],
    ['retention_policy', 'Prazo e regra de conservação'],
  ];

  return fields.map(([key, label]) => `${label}: ${privacy?.[key] ?? 'pendente de definição pela empresa'}.`);
}

function responsibleParties(privacy) {
  const fields = [
    ['controller_cnpj', 'CNPJ'],
    ['controller_address', 'Endereço do controlador'],
    ['controller_site', 'Site do controlador'],
  ];
  const details = fields
    .filter(([key]) => isText(privacy?.[key]))
    .map(([key, label]) => `${label}: ${privacy[key]}.`);
  if (privacy?.privacy_officer)
    details.push(`Encarregado de dados: ${privacy.privacy_officer.name}; ${privacy.privacy_officer.email}.`);
  if (privacy?.report_author)
    details.push(`Responsável pelo relatório/artigo: ${privacy.report_author.name}; ${privacy.report_author.email}. ${privacy.report_author.responsibility}`);

  return details;
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
    ...responsibleParties(privacy),
    'Você pode pedir informações, acesso, correção e demais direitos aplicáveis, incluindo eliminação nas hipóteses legais. A empresa deve avaliar cada pedido e os limites de conservação, sem prometer apagar todo o histórico.',
    'Relatórios externos dependem de autorização específica da empresa e revisão de agregação e risco de identificação. Este aviso não autoriza publicação identificada nem classificação automática de desempenho.',
    'A apresentação ou ciência deste aviso não é consentimento, contrato nem autorização ampla de uso dos dados.',
    approved
      ? 'Governança registrada como aprovada pela empresa; isso não equivale a aprovação da ANPD.'
      : 'GOVERNANÇA DAS MÉTRICAS PENDENTE: o controlador, os canais de privacidade e o responsável pelo relatório/artigo estão identificados. A base legal e a retenção específicas das métricas ainda precisam ser definidas e revisadas pela empresa antes de iniciar nova coleta por participante, ampliar seu uso ou gerar relatórios. Os prazos e bases do formulário de admissão do RH não autorizam automaticamente essas métricas. O uso de ID também exige base legal.',
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

export function validateNoticeResponsibilities(privacy) {
  if (privacy === undefined) return;
  ['controller_cnpj', 'controller_address', 'controller_site'].forEach((field) => {
    if (privacy[field] === undefined) return;
    ensure(isText(privacy[field]), `Privacy ${field} must be non-empty text`);
  });
  ['privacy_officer', 'report_author'].forEach((field) => {
    const person = privacy[field];
    if (person === undefined) return;
    ensure(isText(person?.name) && isText(person?.email), `${field} requires name and email`);
  });
  if (privacy.report_author === undefined) return;
  ensure(
    isText(privacy.report_author.responsibility),
    'Report author requires a documented responsibility',
  );
}
