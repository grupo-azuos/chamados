import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type UserDirectoryProvider } from '../../../lib/auth/user-directory.type';
import { type TraceabilityRepository } from '../repository/traceability.repository';
import { TraceabilityService } from './traceability.service';

const ADMIN = {
  id: 'u-admin',
  email: 'ti@empresa.com.br',
  name: 'TI',
  role: 'admin',
  roles: { infra: 'admin' },
} as unknown as RequestUser;

/* Bruna responde pelo PC, mas não usa o Chamados: só está no diretório inteiro do escritório. */
const BRUNA = { id: 'u-bruna', name: 'Bruna Duarte', email: 'bruna@empresa.com.br', image: null };

function setup(allUsers: unknown[]) {
  const repository = {
    computerIdsOfPerson: vi.fn().mockResolvedValue([7]),
    facts: vi.fn().mockResolvedValue({
      computers: [{ id: 7, label: 'wud90wer', sublabel: null, departmentId: null }],
      responsibles: [{ computerId: 7, personId: BRUNA.id, isCurrent: true }],
      tickets: [],
      parts: [],
      tasks: [],
    }),
  } as unknown as TraceabilityRepository;
  const directory = {
    listUsers: vi.fn().mockResolvedValue([]),
    listAllUsers: vi.fn().mockResolvedValue(allUsers),
  } as unknown as UserDirectoryProvider;

  return new TraceabilityService(repository, undefined, directory);
}

describe('TraceabilityService.graph', () => {
  // feliz
  it('names the PC responsible from the whole office, even without access to Chamados', async () => {
    const graph = await setup([BRUNA]).graph(ADMIN, { focus: 'person', id: BRUNA.id });

    expect(graph.nodes.find((node) => node.id === `person:${BRUNA.id}`)?.label).toBe(
      'Bruna Duarte',
    );
  });

  // triste
  it('says "Fora do diretório" only when the person is not in the office at all', async () => {
    const graph = await setup([]).graph(ADMIN, { focus: 'person', id: 'u-ninguem-sabe' });

    expect(graph.nodes.find((node) => node.kind === 'person')?.label).toBe('Fora do diretório');
  });
});
