import { type INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { computers } from '../src/lib/db/schema/computers.schema';
import { tasks } from '../src/lib/db/schema/tasks.schema';
import { tickets } from '../src/lib/db/schema/tickets.schema';
import { TasksService } from '../src/modules/tasks/service/tasks.service';
import { ANA, asAna, asBia, createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * AS TAREFAS de ponta a ponta, contra um Postgres de verdade: a migration, o chamado de infra
 * virando tarefa (e a tarefa acompanhando o encerramento), a tarefa à mão com etapas e vínculos,
 * e a manutenção vencida virando tarefa da máquina.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const PEDIDO = {
  requesterName: 'Marta da Recepção',
  area: 'infra',
  department: 'RECEPÇÃO',
  problemType: 'printer',
  contactPhone: '62 99999-1234',
  description: 'A impressora da recepção não puxa papel desde ontem.',
};

describe.skipIf(!testDatabaseUrl)('Tasks API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;
  const api = () => request(app.getHttpServer());

  /** A tarefa do chamado nasce em segundo plano: espera ela aparecer. */
  async function taskOfTicket(ticketId: number) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const [row] = await started.db.select().from(tasks).where(eq(tasks.ticketId, ticketId));
      if (row) return row;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`A tarefa do chamado ${ticketId} não apareceu`);
  }

  beforeAll(async () => {
    /* A rodada de manutenção ao subir escreveria junto com o `truncate` de cada teste; aqui ela
       é chamada à mão, no momento certo. */
    process.env.BACKGROUND_JOBS_ENABLED = 'false';
    started = await createE2eApp(testDatabaseUrl!, {
      people: [{ id: ANA.id, name: ANA.name, email: ANA.email, image: null }],
    });
    app = started.app;
  });

  beforeEach(async () => {
    await started.truncate(
      'history',
      'task_stages',
      'tasks',
      'ticket_histories',
      'tickets',
      'maintenances',
      'maintenance_schedules',
      'computers',
    );
  });

  afterAll(async () => {
    await app.close();
    delete process.env.BACKGROUND_JOBS_ENABLED;
  });

  // feliz
  it('turns an infra ticket into a task that finishes when the ticket is resolved', async () => {
    const opened = await api().post('/api/v1/tickets').set(asAna()).send(PEDIDO).expect(201);
    const ticketId = opened.body.id as number;

    const task = await taskOfTicket(ticketId);
    expect(task).toMatchObject({ area: 'infra', origin: 'ticket', status: 'open' });

    await api()
      .post(`/api/v1/tickets/${ticketId}/histories`)
      .set(asAna())
      .send({ type: 'start', description: 'Peguei o chamado.' })
      .expect(201);
    await api()
      .post(`/api/v1/tickets/${ticketId}/histories`)
      .set(asAna())
      .send({ type: 'resolution', description: 'Troquei o rolete.' })
      .expect(201);

    for (let attempt = 0; attempt < 40; attempt++) {
      const [row] = await started.db.select().from(tasks).where(eq(tasks.id, task.id));
      if (row?.status === 'done') break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const [finished] = await started.db.select().from(tasks).where(eq(tasks.id, task.id));
    expect(finished).toMatchObject({ status: 'done', ownerId: ANA.id });
    expect(finished?.finishedAt).toBeInstanceOf(Date);
  });

  // feliz
  it('creates a task by hand with steps and links, and finishes it on the last step', async () => {
    const opened = await api().post('/api/v1/tickets').set(asAna()).send(PEDIDO).expect(201);
    await taskOfTicket(opened.body.id as number);

    const created = await api()
      .post('/api/v1/tasks')
      .set(asAna())
      .send({
        area: 'infra',
        title: 'Trocar o switch da sala 2',
        startDate: '2026-11-23',
        dueDate: '2026-11-30',
        steps: ['Comprar', 'Instalar'],
        links: [{ kind: 'ticket', targetId: opened.body.id }],
      })
      .expect(201);

    expect(created.body).toMatchObject({
      origin: 'manual',
      status: 'open',
      owner: { id: ANA.id, name: ANA.name },
      progress: { done: 0, total: 2 },
      links: [{ kind: 'ticket', label: expect.stringMatching(/^CH-\d{4}$/) }],
    });

    const [first, second] = created.body.steps as { id: number }[];
    await api()
      .patch(`/api/v1/tasks/${created.body.id}/steps/${first!.id}`)
      .set(asAna())
      .send({ done: true })
      .expect(200);
    const done = await api()
      .patch(`/api/v1/tasks/${created.body.id}/steps/${second!.id}`)
      .set(asAna())
      .send({ done: true })
      .expect(200);

    expect(done.body).toMatchObject({ status: 'done', progress: { done: 2, total: 2 } });
    /* Quem marcou cada etapa e quem criou aparecem na página da tarefa ("feita por", "Criada por"). */
    expect(done.body.steps[0]).toMatchObject({
      done: true,
      doneBy: { id: ANA.id, name: ANA.name },
    });
    expect(done.body.createdBy).toMatchObject({ id: ANA.id, name: ANA.name });

    /* A linha do tempo lê o Histórico: a mais nova primeiro, com o nome de quem fez. */
    const timeline = await api()
      .get(`/api/v1/tasks/${created.body.id}/history`)
      .set(asAna())
      .expect(200);
    expect(timeline.body.map((entry: { action: string }) => entry.action)).toEqual([
      'setStepDone',
      'setStepDone',
      'create',
    ]);
    expect(timeline.body[0]).toMatchObject({
      actorName: ANA.name,
      changes: [{ field: 'done', to: true }],
    });

    const list = await api().get('/api/v1/tasks').query({ area: 'infra' }).set(asAna()).expect(200);
    expect(list.body.total).toBe(2);
  });

  // triste
  it('refuses a link to something that does not exist and a manager that only reads', async () => {
    await api()
      .post('/api/v1/tasks')
      .set(asAna())
      .send({
        area: 'infra',
        title: 'Fantasma',
        startDate: '2026-11-23',
        links: [{ kind: 'computer', targetId: 999 }],
      })
      .expect(422);

    await api()
      .post('/api/v1/tasks')
      .set(asBia())
      .send({ area: 'infra', title: 'Sem permissão', startDate: '2026-11-23' })
      .expect(403);
  });

  // triste
  it('does not let a ticket task be finished by hand nor deleted', async () => {
    const opened = await api().post('/api/v1/tickets').set(asAna()).send(PEDIDO).expect(201);
    const task = await taskOfTicket(opened.body.id as number);

    await api()
      .post(`/api/v1/tasks/${task.id}/status`)
      .set(asAna())
      .send({ status: 'done' })
      .expect(422);
    await api().delete(`/api/v1/tasks/${task.id}`).set(asAna()).expect(422);
  });

  // feliz
  it('opens a maintenance task for a machine whose preventive is overdue, once', async () => {
    const [machine] = await started.db
      .insert(computers)
      .values({
        name: 'RECEPCAO-D01',
        tokenHash: 'hash-da-recepcao',
        createdBy: 'ti@empresa.com.br',
      })
      .returning();
    const service = app.get(TasksService);

    const first = await service.syncMaintenance(new Date('2026-11-23T12:00:00Z'));
    const again = await service.syncMaintenance(new Date('2026-11-23T12:00:00Z'));

    /* Máquina sem preventiva nenhuma não tem data de partida: nada vence, nada abre. */
    expect(first).toEqual({ opened: 0, finished: 0 });
    expect(again).toEqual({ opened: 0, finished: 0 });

    await started.db.execute(
      `insert into chamados.maintenances (computer_id, type, performed_at, created_by)
       values (${machine!.id}, 'preventive', '2026-07-01T12:00:00Z', 'ti@empresa.com.br')`,
    );
    expect(await service.syncMaintenance(new Date('2026-11-23T12:00:00Z'))).toEqual({
      opened: 1,
      finished: 0,
    });
    expect(await service.syncMaintenance(new Date('2026-11-23T12:00:00Z'))).toEqual({
      opened: 0,
      finished: 0,
    });

    const [task] = await started.db.select().from(tasks).where(eq(tasks.computerId, machine!.id));
    expect(task).toMatchObject({
      origin: 'maintenance',
      status: 'open',
      title: 'Preventiva — RECEPCAO-D01',
    });

    /* A preventiva registrada: a máquina não pede mais, e a tarefa finaliza. */
    await started.db.execute(
      `insert into chamados.maintenances (computer_id, type, performed_at, created_by)
       values (${machine!.id}, 'preventive', '2026-11-23T11:00:00Z', 'ti@empresa.com.br')`,
    );
    expect(await service.syncMaintenance(new Date('2026-11-23T12:00:00Z'))).toEqual({
      opened: 0,
      finished: 1,
    });
    const [closed] = await started.db.select().from(tasks).where(eq(tasks.id, task!.id));
    expect(closed?.status).toBe('done');
  });

  // feliz
  it('creates stages of the team, moves a task through them and finishing takes it out', async () => {
    const waiting = await api()
      .post('/api/v1/task-stages')
      .set(asAna())
      .send({ area: 'infra', label: 'Aguardando peça', color: '#FF9500' })
      .expect(201);
    const supplier = await api()
      .post('/api/v1/task-stages')
      .set(asAna())
      .send({ area: 'infra', label: 'Com o fornecedor', color: '#5856d6' })
      .expect(201);
    expect(waiting.body).toMatchObject({ label: 'Aguardando peça', color: '#ff9500', position: 0 });
    expect(supplier.body.position).toBe(1);

    const moved = await api()
      .post(`/api/v1/task-stages/${supplier.body.id}/move`)
      .set(asAna())
      .send({ direction: -1 })
      .expect(201);
    expect(moved.body.map((stage: { label: string }) => stage.label)).toEqual([
      'Com o fornecedor',
      'Aguardando peça',
    ]);

    const task = await api()
      .post('/api/v1/tasks')
      .set(asAna())
      .send({ area: 'infra', title: 'Trocar a fonte', startDate: '2026-11-23' })
      .expect(201);
    const staged = await api()
      .put(`/api/v1/tasks/${task.body.id}/stage`)
      .set(asAna())
      .send({ stageId: waiting.body.id })
      .expect(200);
    expect(staged.body).toMatchObject({
      status: 'open',
      stage: { label: 'Aguardando peça', color: '#ff9500' },
    });

    const filtered = await api()
      .get('/api/v1/tasks')
      .query({ area: 'infra', stageId: waiting.body.id })
      .set(asAna())
      .expect(200);
    expect(filtered.body.total).toBe(1);

    const finished = await api()
      .post(`/api/v1/tasks/${task.body.id}/status`)
      .set(asAna())
      .send({ status: 'done' })
      .expect(201);
    expect(finished.body).toMatchObject({ status: 'done', stage: null });

    /* A finalizada que vai para uma situação própria é reaberta. */
    const back = await api()
      .put(`/api/v1/tasks/${task.body.id}/stage`)
      .set(asAna())
      .send({ stageId: supplier.body.id })
      .expect(200);
    expect(back.body).toMatchObject({ status: 'reopened', stage: { label: 'Com o fornecedor' } });

    await api().delete(`/api/v1/task-stages/${supplier.body.id}`).set(asAna()).expect(204);
    const released = await api().get(`/api/v1/tasks/${task.body.id}`).set(asAna()).expect(200);
    expect(released.body).toMatchObject({ status: 'reopened', stage: null });
    const left = await api()
      .get('/api/v1/task-stages')
      .query({ area: 'infra' })
      .set(asAna())
      .expect(200);
    expect(left.body.map((stage: { label: string }) => stage.label)).toEqual(['Aguardando peça']);
  });

  // triste
  it('refuses a repeated or fixed stage name, a stage that does not exist and a manager that only reads', async () => {
    await api()
      .post('/api/v1/task-stages')
      .set(asAna())
      .send({ area: 'infra', label: 'Aguardando peça', color: '#ff9500' })
      .expect(201);
    await api()
      .post('/api/v1/task-stages')
      .set(asAna())
      .send({ area: 'infra', label: 'aguardando PEÇA', color: '#ff9500' })
      .expect(409);
    await api()
      .post('/api/v1/task-stages')
      .set(asAna())
      .send({ area: 'infra', label: 'Finalizada', color: '#ff9500' })
      .expect(400);
    const task = await api()
      .post('/api/v1/tasks')
      .set(asAna())
      .send({ area: 'infra', title: 'Trocar a fonte', startDate: '2026-11-23' })
      .expect(201);
    await api()
      .put(`/api/v1/tasks/${task.body.id}/stage`)
      .set(asAna())
      .send({ stageId: 999 })
      .expect(422);
    await api()
      .post('/api/v1/task-stages')
      .set(asBia())
      .send({ area: 'infra', label: 'Outra', color: '#ff9500' })
      .expect(403);
  });

  // feliz
  it('turns a Sistema ticket into a task of Sistema, and leaves a Manutenção ticket alone', async () => {
    const [sistema, manutencao] = await started.db
      .insert(tickets)
      .values([
        {
          requesterName: 'Pessoa de Teste',
          area: 'sistema',
          department: 'Comercial',
          problemType: 'bug',
          description: 'A tela de vendas não abre.',
        },
        {
          requesterName: 'Pessoa de Teste',
          area: 'manutencao',
          department: 'Comercial',
          problemType: 'other',
          description: 'A porta da sala range.',
        },
      ])
      .returning();
    const service = app.get(TasksService);

    await service.syncTicket(sistema!);
    await service.syncTicket(manutencao!);

    const [task] = await started.db.select().from(tasks).where(eq(tasks.ticketId, sistema!.id));
    expect(task).toMatchObject({
      area: 'sistema',
      origin: 'ticket',
      status: 'open',
      title: 'A tela de vendas não abre.',
    });
    const others = await started.db.select().from(tasks).where(eq(tasks.ticketId, manutencao!.id));
    expect(others).toEqual([]);
  });
});
