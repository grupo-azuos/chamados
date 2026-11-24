import { type ProjectMapEntry } from '@template/shared/schemas/project-map.schema';

/**
 * Um sistema com uma issue aberta (com chamado e tarefa), um PR que cita a issue, um merge e o git:
 * a develop que juntou uma feature, e uma branch nova (pulsa).
 */
const commit = (sha: string, parents: string[], message: string, day: string) => ({
  sha,
  parents,
  message,
  authorLogin: 'vini',
  authorName: 'Vinícius Gabriel',
  committedAt: `${day}T10:00:00.000Z`,
});

export function projectMapEntryFixture(id = 1, name = 'Paralegal'): ProjectMapEntry {
  const event = (
    eventId: number,
    type: 'pr' | 'issue' | 'merge',
    externalId: string,
    title: string,
    status: 'open' | 'merged' | 'closed',
  ) => ({
    id: eventId,
    type,
    externalId,
    title,
    status,
    url: `https://github.com/org/x/${eventId}`,
    author: 'vini',
    eventDate: '2026-11-20T10:00:00.000Z',
  });

  return {
    project: { id, name, repositoryUrl: `org/${name.toLowerCase()}`, status: 'active' },
    events: [
      event(id * 10, 'issue', '#12', 'Tela não abre', 'open'),
      event(id * 10 + 1, 'pr', '#13', 'Corrige a tela (#12)', 'merged'),
      event(id * 10 + 2, 'merge', 'a1b2c3d', '[merge](web): Tela', 'merged'),
    ],
    hiddenEvents: 2,
    tickets: [
      {
        id: id * 100,
        status: 'open',
        isClosed: false,
        description: 'A tela não abre',
        githubIssueNumber: 12,
      },
    ],
    tasks: [{ id: id * 1000, title: 'A tela não abre', status: 'open', ticketId: id * 100 }],
    commits: [
      commit('m2c4e6a8', ['b1a2c3d4', 'f9e8d7c6'], '[merge](web): Tela', '2026-11-21'),
      commit('f9e8d7c6', ['b1a2c3d4'], '[feat](web): Tela', '2026-11-20'),
      commit('b1a2c3d4', [], '[feat](web): Início', '2026-11-18'),
    ],
    tags: [{ name: 'v1.0.0', sha: 'b1a2c3d4' }],
    branches: [
      {
        name: 'develop',
        headSha: 'm2c4e6a8',
        firstSeenAt: '2026-01-01T00:00:00.000Z',
        lastPushAt: null,
      },
      {
        name: 'feature/mapa',
        headSha: 'f9e8d7c6',
        firstSeenAt: '2026-11-22T00:00:00.000Z',
        lastPushAt: null,
      },
    ],
  };
}
