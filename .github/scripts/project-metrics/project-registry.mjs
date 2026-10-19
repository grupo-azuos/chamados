import { validateNoticeReceipt } from './privacy-notice.mjs';
import {
  ensure,
  isText,
  validateCount,
  validateDate,
  validateFields,
  validateNullableText,
  validateTextList,
} from './validation.util.mjs';

const REQUIRED_FIELDS = [
  'schema_version',
  'repository',
  'project_type',
  'status',
  'participants',
  'shared_accounts',
  'tools',
  'milestones',
  'requirements_meetings',
  'technical_blockers',
  'traditional_estimate_days',
  'pending_fields',
  'evidence',
];
const PERSON_FIELDS = [
  'id',
  'name',
  'email',
  'department',
  'role',
  'github_logins',
  'git_emails',
  'prior_it_experience',
];
const MILESTONES = ['started_at', 'mvp_at', 'production_at', 'abandoned_at'];
export const PARTICIPANT_ROLES = new Set(['business', 'technical', 'automation']);

function validateParticipant(person, identifiers) {
  validateFields(person, PERSON_FIELDS, 'participant');
  ensure(
    isText(person.id) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(person.id),
    'Participant id must use kebab-case',
  );
  ensure(!identifiers.has(person.id), `Duplicate participant id: ${person.id}`);
  identifiers.add(person.id);
  ensure(PARTICIPANT_ROLES.has(person.role), `Invalid participant role: ${person.id}`);
  ['name', 'email', 'department'].forEach((field) =>
    validateNullableText(person[field], `participant.${field}`),
  );
  ['github_logins', 'git_emails'].forEach((field) =>
    validateTextList(person[field], `participant.${field}`),
  );
}

function validateSharedAccount(account, identifiers) {
  validateFields(account, ['login', 'participant_ids', 'git_emails'], 'shared_account');
  ensure(isText(account.login), 'Shared account login is required');
  validateTextList(account.git_emails, 'shared_account.git_emails');
  validateTextList(account.participant_ids, 'shared_account.participant_ids');
  ensure(
    account.participant_ids.every((id) => identifiers.has(id)),
    'Shared account references an unknown participant',
  );
}

function validateMilestones(milestones) {
  validateFields(milestones, MILESTONES, 'milestones');
  MILESTONES.forEach((field) => validateDate(milestones[field], `milestones.${field}`));
}

function validateBlocker(blocker) {
  validateFields(blocker, ['description', 'days'], 'technical_blocker');
  ensure(isText(blocker.description), 'Blocker description is required');
  validateCount(blocker.days, 'technical_blocker.days');
}

function validateIntervention(intervention, identifiers) {
  validateFields(
    intervention,
    [
      'id',
      'participant_id',
      'category',
      'description',
      'occurred_at',
      'duration_days',
      'commits',
      'evidence',
    ],
    'technical_intervention',
  );
  ensure(
    identifiers.has(intervention.participant_id),
    'Intervention participant is not registered',
  );
  ensure(
    ['feature_enablement', 'standards_remediation', 'environment_recovery', 'integration'].includes(
      intervention.category,
    ),
    'Invalid intervention category',
  );
  ensure(
    isText(intervention.id) && isText(intervention.description),
    'Intervention id and description are required',
  );
  validateDate(intervention.occurred_at, 'technical_intervention.occurred_at');
  validateCount(intervention.duration_days, 'technical_intervention.duration_days');
  validateTextList(intervention.commits, 'technical_intervention.commits');
  ensure(
    intervention.commits.every((sha) => /^[a-f0-9]{40}$/.test(sha)),
    'Interventions must reference full commit SHAs',
  );
  ensure(isText(intervention.evidence), 'Intervention evidence is required');
}

function validatePrivacy(privacy) {
  if (privacy === undefined) return;
  validateFields(
    privacy,
    [
      'commit_identity',
      'governance_status',
      'purpose',
      'controller',
      'contact',
      'lawful_basis',
      'retention_policy',
      'repository_visibility',
    ],
    'privacy',
  );
  ensure(
    ['private', 'public', 'unknown'].includes(privacy.repository_visibility),
    'Invalid repository visibility',
  );
  ensure(
    ['identified', 'pseudonymous'].includes(privacy.commit_identity),
    'Invalid commit identity mode',
  );
  ensure(
    ['pending_review', 'approved'].includes(privacy.governance_status),
    'Invalid privacy governance status',
  );
  ensure(isText(privacy.purpose), 'A documented processing purpose is required');
  ['controller', 'contact', 'lawful_basis', 'retention_policy'].forEach((key) =>
    validateNullableText(privacy[key], `privacy.${key}`),
  );
  if (privacy.governance_status !== 'approved') return;
  ['controller', 'contact', 'lawful_basis', 'retention_policy'].forEach((key) =>
    ensure(isText(privacy[key]), `Approved privacy governance requires ${key}`),
  );
}

function validateCollections(data) {
  [
    'participants',
    'shared_accounts',
    'tools',
    'technical_blockers',
    'pending_fields',
    'evidence',
  ].forEach((field) => ensure(Array.isArray(data[field]), `${field} must be an array`));
  validateTextList(data.tools, 'tools');
  validateTextList(data.pending_fields, 'pending_fields');
  data.technical_blockers.forEach(validateBlocker);
  data.evidence.forEach((entry) => validateFields(entry, ['source'], 'evidence'));
  if (data.technical_interventions === undefined) return;
  ensure(Array.isArray(data.technical_interventions), 'technical_interventions must be an array');
}

export function parseRegistry(raw) {
  const data = JSON.parse(raw);
  validateFields(data, REQUIRED_FIELDS, 'project');
  ensure(data.schema_version === 1, 'Unsupported registry schema version');
  ensure(isText(data.repository), 'Repository is required');
  ensure(
    ['application', 'template', 'shared_resource'].includes(data.project_type),
    'Invalid project type',
  );
  ensure(
    [null, 'prototype', 'integration', 'production', 'abandoned'].includes(data.status),
    'Invalid project status',
  );
  validateCollections(data);
  validateMilestones(data.milestones);
  ['requirements_meetings', 'traditional_estimate_days'].forEach((field) =>
    validateCount(data[field], field),
  );
  const identifiers = new Set();
  data.participants.forEach((person) => validateParticipant(person, identifiers));
  data.shared_accounts.forEach((account) => validateSharedAccount(account, identifiers));
  data.technical_interventions?.forEach((entry) => validateIntervention(entry, identifiers));
  validatePrivacy(data.privacy);
  data.participants.forEach((person) => validateNoticeReceipt(person, data.privacy));

  return data;
}
