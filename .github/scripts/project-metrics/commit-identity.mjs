import { ensure, isText } from './validation.util.mjs';

const IDENTITY_FIELDS = new Map([
  ['Participant-Id', 'id'],
  ['Participant-Name', 'name'],
  ['Participant-Email', 'email'],
  ['Department', 'department'],
  ['Participant-Role', 'role'],
]);
const MINIMAL_FIELDS = ['Participant-Id', 'Participant-Role', 'AI-Tool'];
const PERSONAL_FIELDS = ['Participant-Name', 'Participant-Email', 'Department'];

function parseTrailerLines(raw) {
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .reduce((trailers, line) => {
      const separator = line.indexOf(':');
      ensure(separator > 0, 'Invalid parsed Git trailer');
      const key = line.slice(0, separator).toLowerCase();
      const values = trailers.get(key) ?? [];
      values.push(line.slice(separator + 1).trim());
      trailers.set(key, values);

      return trailers;
    }, new Map());
}

function requireTrailer(trailers, name) {
  const values = trailers.get(name.toLowerCase());
  ensure(values?.length === 1 && isText(values[0]), `Exactly one ${name} trailer is required`);

  return values[0];
}

function validateIdentityField(trailers, person, name) {
  const field = IDENTITY_FIELDS.get(name);
  ensure(isText(person[field]), `Participant ${person.id} is missing ${field}`);
  ensure(
    requireTrailer(trailers, name) === person[field],
    `${name} does not match the committed registry`,
  );
}

function validateIdentifiedPerson(person) {
  ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email), 'Participant email is invalid');
  ensure(
    person.git_emails.includes(person.email),
    'Participant email must be registered in git_emails',
  );
}

export function validateCommitIdentity(data, parsedTrailers) {
  const trailers = parseTrailerLines(parsedTrailers);
  const pseudonymous = data.privacy?.commit_identity === 'pseudonymous';
  const required = pseudonymous ? MINIMAL_FIELDS : [...IDENTITY_FIELDS.keys(), 'AI-Tool'];
  required.forEach((name) => requireTrailer(trailers, name));
  const participantId = requireTrailer(trailers, 'Participant-Id');
  const person = data.participants.find((entry) => entry.id === participantId);
  ensure(person, 'Participant-Id is not registered in this commit');
  if (pseudonymous)
    ensure(
      /^p-[a-f0-9]{32}$/.test(person.id),
      'Pseudonymous commits require an opaque participant id',
    );
  const fields = pseudonymous
    ? ['Participant-Id', 'Participant-Role']
    : [...IDENTITY_FIELDS.keys()];
  fields.forEach((name) => validateIdentityField(trailers, person, name));
  ensure(data.tools.includes(requireTrailer(trailers, 'AI-Tool')), 'AI-Tool is not registered');
  if (!pseudonymous) {
    validateIdentifiedPerson(person);

    return;
  }
  PERSONAL_FIELDS.forEach((name) =>
    ensure(
      !trailers.has(name.toLowerCase()),
      `${name} must not be duplicated in pseudonymous metrics trailers`,
    ),
  );
}
