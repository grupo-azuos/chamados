export function projectFixture() {
  return {
    schema_version: 1,
    repository: 'example/project',
    project_type: 'application',
    status: null,
    participants: [
      {
        id: 'p-0123456789abcdef0123456789abcdef',
        name: 'Ana Silva',
        email: 'ana@example.com',
        department: 'Fiscal',
        role: 'business',
        github_logins: [],
        git_emails: ['ana@example.com'],
        prior_it_experience: null,
      },
    ],
    shared_accounts: [],
    tools: ['Claude Code'],
    milestones: { started_at: null, mvp_at: null, production_at: null, abandoned_at: null },
    requirements_meetings: null,
    technical_blockers: [],
    traditional_estimate_days: null,
    pending_fields: [],
    evidence: [],
  };
}

export const IDENTIFIED_MESSAGE = `[feat](web): Cadastro de clientes

Participant-Id: p-0123456789abcdef0123456789abcdef
Participant-Name: Ana Silva
Participant-Email: ana@example.com
Department: Fiscal
Participant-Role: business
AI-Tool: Claude Code
`;

export const MINIMAL_MESSAGE = `[feat](web): Cadastro de clientes

Participant-Id: p-0123456789abcdef0123456789abcdef
Participant-Role: business
AI-Tool: Claude Code
`;
