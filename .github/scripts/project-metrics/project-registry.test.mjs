import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRegistry } from './project-registry.mjs';
import { projectFixture } from './metrics-fixture.mjs';

function validateFixture(change = () => {}) {
  const fixture = projectFixture();
  change(fixture);

  return parseRegistry(JSON.stringify(fixture));
}

test('accepts a complete registry and unknown historical participants', () => {
  // feliz: pendências históricas não impedem o responsável atual de trabalhar.
  const data = validateFixture((fixture) =>
    fixture.participants.push({
      ...fixture.participants[0],
      id: 'historical',
      name: null,
      email: null,
      department: null,
    }),
  );
  assert.equal(data.participants.length, 2);
});

test('rejects malformed dates instead of normalizing them', () => {
  // triste: o JavaScript ajusta 30 de fevereiro; o cadastro deve recusá-lo.
  assert.throws(
    () =>
      validateFixture((data) => {
        data.milestones.started_at = '2026-02-30';
      }),
    /calendar date/,
  );
});

test('rejects duplicate identities and references to unknown participants', () => {
  // triste: IDs duplicados tornam a autoria ambígua.
  assert.throws(
    () => validateFixture((data) => data.participants.push(data.participants[0])),
    /Duplicate/,
  );
  assert.throws(
    () =>
      validateFixture((data) =>
        data.shared_accounts.push({
          login: 'shared',
          git_emails: [],
          participant_ids: ['missing'],
        }),
      ),
    /unknown participant/,
  );
});

test('rejects invalid counters and malformed intervention records', () => {
  // triste: estimativas desconhecidas são null; não recebem valores inventados.
  assert.throws(
    () =>
      validateFixture((data) => {
        data.requirements_meetings = -1;
      }),
    /non-negative/,
  );
  assert.throws(
    () =>
      validateFixture((data) => {
        data.technical_interventions = [{}];
      }),
    /required/,
  );
});

test('does not accept approved privacy governance with missing company decisions', () => {
  // triste: preencher um campo de status não comprova adequação à LGPD.
  assert.throws(
    () =>
      validateFixture((data) => {
        data.privacy = {
          repository_visibility: 'private',
          commit_identity: 'identified',
          governance_status: 'approved',
          purpose: 'internal_metrics',
          controller: null,
          contact: null,
          lawful_basis: null,
          retention_policy: null,
        };
      }),
    /Approved privacy governance requires/,
  );
});
