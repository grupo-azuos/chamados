import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { validateCommitIdentity } from './commit-identity.mjs';
import { IDENTIFIED_MESSAGE, MINIMAL_MESSAGE, projectFixture } from './metrics-fixture.mjs';

function parsed(message) {
  return execFileSync('git', ['interpret-trailers', '--parse'], {
    input: message,
    encoding: 'utf8',
  });
}

test('accepts one identified participant with a registered tool', () => {
  // feliz: o parser real do Git interpreta apenas o bloco final de trailers.
  assert.doesNotThrow(() => validateCommitIdentity(projectFixture(), parsed(IDENTIFIED_MESSAGE)));
});

test('rejects duplicate trailers and identities inconsistent with the registry', () => {
  // triste: duplicação e troca silenciosa de pessoa não podem virar métricas.
  assert.throws(
    () =>
      validateCommitIdentity(projectFixture(), parsed(`${IDENTIFIED_MESSAGE}Department: Fiscal\n`)),
    /Exactly one Department/,
  );
  assert.throws(
    () =>
      validateCommitIdentity(
        projectFixture(),
        parsed(
          IDENTIFIED_MESSAGE.replace(
            'Participant-Name: Ana Silva',
            'Participant-Name: Another person',
          ),
        ),
      ),
    /does not match/,
  );
});

test('does not accept trailer-looking lines embedded in the message body', () => {
  // triste: o corpo do commit não substitui a atribuição final.
  assert.throws(
    () =>
      validateCommitIdentity(
        projectFixture(),
        parsed(`${IDENTIFIED_MESSAGE}\nA paragraph after the trailer block.\n`),
      ),
    /required/,
  );
});

test('accepts minimal trailers and rejects duplicated personal data in pseudonymous mode', () => {
  // feliz: minimização vale nos novos trailers sem reescrever o histórico.
  const data = projectFixture();
  data.privacy = { commit_identity: 'pseudonymous' };
  assert.doesNotThrow(() => validateCommitIdentity(data, parsed(MINIMAL_MESSAGE)));
  // triste: o cadastro restrito não autoriza repetir dados em cada commit.
  assert.throws(
    () => validateCommitIdentity(data, parsed(IDENTIFIED_MESSAGE)),
    /must not be duplicated/,
  );
});

test('rejects missing identity and unregistered tools', () => {
  // triste: papéis e ferramentas não são inferidos do título do commit.
  assert.throws(
    () => validateCommitIdentity(projectFixture(), parsed(MINIMAL_MESSAGE)),
    /Participant-Name/,
  );
  assert.throws(
    () =>
      validateCommitIdentity(
        projectFixture(),
        parsed(IDENTIFIED_MESSAGE.replace('AI-Tool: Claude Code', 'AI-Tool: Unregistered')),
      ),
    /not registered/,
  );
});
