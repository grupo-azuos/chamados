import { ensure, isText } from './validation.util.mjs';

const PROFILE_FIELDS = ['name', 'email', 'department', 'position', 'prior_it_experience'];
const PROFILE_LISTS = ['github_logins', 'git_emails'];

function previousParticipant(previous, person) {
  const identifiers = new Set([person.id, ...(person.legacy_ids ?? [])]);

  return previous.participants.find((entry) => identifiers.has(entry.id));
}

function addsProfileList(person, previous, field, sharedLogins) {
  const oldValues = new Set(previous?.[field] ?? []);

  return person[field].some((value) => !oldValues.has(value) && !sharedLogins.has(value));
}

function addsProfile(person, previous, sharedLogins) {
  if (PROFILE_FIELDS.some((field) => isText(person[field]) && person[field] !== previous?.[field]))
    return true;

  return PROFILE_LISTS.some((field) => addsProfileList(person, previous, field, sharedLogins));
}

function validateDisclosure(person, privacy) {
  ensure(
    privacy?.repository_visibility === 'private',
    'Identified profiles require a restricted repository',
  );
  ensure(
    privacy.governance_status === 'approved',
    'Complete privacy governance before recording a new identified profile',
  );
  const disclosure = person.profile_disclosure;
  ensure(
    disclosure?.requested_by_participant === true,
    'Record the participant request before storing optional profile data',
  );
  ensure(
    isText(disclosure.notice_version) && isText(disclosure.recorded_at),
    'Record the notice version and request date',
  );
}

export function validateProfileChanges(previous, current) {
  if (previous.privacy?.commit_identity === 'pseudonymous') {
    ensure(
      current.privacy?.commit_identity === 'pseudonymous',
      'Do not remove pseudonymous identity protection from new commits',
    );
  }
  if (current.privacy === undefined) return;
  const sharedLogins = new Set(current.shared_accounts.map((account) => account.login));
  current.participants.forEach((person) => {
    const existing = previousParticipant(previous, person);
    if (!addsProfile(person, existing, sharedLogins)) return;
    validateDisclosure(person, current.privacy);
  });
}
