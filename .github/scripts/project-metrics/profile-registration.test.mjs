import assert from 'node:assert/strict';
import { test } from 'node:test';
import { projectFixture } from './metrics-fixture.mjs';
import { validateProfileChanges } from './profile-registration.mjs';

function governedFixture(visibility = 'private') {
  const data = projectFixture();
  data.privacy = { repository_visibility: visibility, governance_status: 'pending_review' };

  return data;
}

test('keeps known profiles without treating an opaque id migration as new collection', () => {
  const before = projectFixture();
  const after = governedFixture();
  after.participants[0].legacy_ids = [before.participants[0].id];
  after.participants[0].id = 'p-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  // feliz: dados já registrados continuam vinculados sem reescrever commits antigos.
  assert.doesNotThrow(() => validateProfileChanges(before, after));
});

test('allows default registration without names or email addresses', () => {
  const data = governedFixture();
  data.participants.push({
    id: 'p-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    name: null,
    email: null,
    department: null,
    role: 'business',
    github_logins: [],
    git_emails: [],
    prior_it_experience: null,
  });
  // feliz: participar das métricas não exige oferecer um perfil identificado.
  assert.doesNotThrow(() => validateProfileChanges(projectFixture(), data));
});

test('blocks new identified profiles until company decisions are recorded', () => {
  const data = governedFixture();
  data.participants[0].email = 'new@example.com';
  // triste: oferecer o e-mail na conversa não configura aprovação automática.
  assert.throws(() => validateProfileChanges(projectFixture(), data), /privacy governance/);
});

test('accepts a requested profile in a restricted repository with reviewed governance', () => {
  const data = governedFixture();
  data.privacy.governance_status = 'approved';
  data.participants[0].email = 'new@example.com';
  data.participants[0].profile_disclosure = {
    requested_by_participant: true,
    notice_version: '1',
    recorded_at: '2026-10-19',
  };
  // feliz: o pedido é registrado; a definição da base legal é uma decisão separada.
  assert.doesNotThrow(() => validateProfileChanges(projectFixture(), data));
  // triste: repositório público não é o local de cadastro identificado escolhido para o projeto.
  data.privacy.repository_visibility = 'public';
  assert.throws(() => validateProfileChanges(projectFixture(), data), /restricted repository/);
});
