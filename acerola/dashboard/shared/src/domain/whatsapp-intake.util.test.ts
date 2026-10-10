import { describe, expect, it } from 'vitest';

import {
  buildAreaOptions,
  buildIntakeForm,
  type IntakeContext,
  parseAreaChoice,
  parseIntakeReply,
} from './whatsapp-intake.util';

const infra: IntakeContext = { area: 'infra', projects: [], phone: '5562999990002' };
const sistema: IntakeContext = {
  area: 'sistema',
  projects: [
    { id: 11, name: 'Portal do Cliente' },
    { id: 12, name: 'Folha' },
  ],
  phone: '5562999990002',
};

function filled(lines: string[]): string {
  return lines.join('\n');
}

describe('buildIntakeForm', () => {
  // feliz
  it('asks name, sector, type and description, with numbered options below', () => {
    const form = buildIntakeForm(infra);

    expect(form).toContain('Nome: ');
    expect(form).toContain('Setor (número): ');
    expect(form).toContain('Tipo (número): ');
    expect(form).toContain('Descrição: ');
    expect(form).toMatch(/Opções de setor: 1 /);
    expect(form).toMatch(/Opções de tipo: 1 /);
  });

  it('asks which system only in the Sistema area', () => {
    expect(buildIntakeForm(sistema)).toContain('Opções de sistema: 1 Portal do Cliente · 2 Folha');
    expect(buildIntakeForm(infra)).not.toContain('Sistema (número)');
  });

  // triste
  /* Sem o telefone informado pelo WhatsApp, o chamado ficaria sem contato: o formulário pergunta. */
  it('asks the phone only when WhatsApp did not tell it', () => {
    expect(buildIntakeForm(infra)).not.toContain('Telefone');
    expect(buildIntakeForm({ ...infra, phone: null })).toContain('Telefone com DDD: ');
  });
});

describe('parseIntakeReply', () => {
  // feliz
  it('turns a filled form into a ticket, taking the phone from WhatsApp', () => {
    const reply = `${buildIntakeForm(infra)}`
      .replace('Nome: ', 'Nome: Bia Costa')
      .replace('Setor (número): ', 'Setor (número): 6')
      .replace('Tipo (número): ', 'Tipo (número): 3')
      .replace('Descrição: ', 'Descrição: A impressora não puxa papel.');

    expect(parseIntakeReply(reply, infra)).toEqual({
      ok: true,
      data: {
        requesterName: 'Bia Costa',
        department: 'financeiro',
        problemType: 'printer',
        projectId: null,
        contactPhone: '5562999990002',
        description: 'A impressora não puxa papel.',
      },
    });
  });

  it('keeps a description written over several lines, and stops at the options', () => {
    const reply = filled([
      'Nome: Bia Costa',
      'Setor: 6',
      'Tipo: 3',
      'Descrição: A impressora não puxa papel.',
      'Já tentei desligar e ligar.',
      '',
      'Opções de setor: 1 Analyze · 2 Certificado',
    ]);

    const result = parseIntakeReply(reply, infra);

    expect(result.ok && result.data.description).toBe(
      'A impressora não puxa papel.\nJá tentei desligar e ligar.',
    );
  });

  it('accepts the option written by name, with WhatsApp bold and without accents', () => {
    const reply = filled([
      '*Nome:* Bia',
      '*Setor:* financeiro',
      '*Tipo:* IMPRESSORA',
      '*Descricao:* Não imprime.',
    ]);

    const result = parseIntakeReply(reply, infra);

    expect(result.ok && result.data.department).toBe('financeiro');
    expect(result.ok && result.data.problemType).toBe('printer');
  });

  it('reads the chosen system and the typed phone when they are asked', () => {
    const reply = filled([
      'Nome: Bia',
      'Setor: 6',
      'Tipo: 1',
      'Sistema: 2',
      'Telefone com DDD: (62) 99999-0003',
      'Descrição: Erro ao gerar a folha.',
    ]);

    const result = parseIntakeReply(reply, { ...sistema, phone: null });

    expect(result.ok && result.data.projectId).toBe(12);
    expect(result.ok && result.data.contactPhone).toBe('62999990003');
  });

  // triste
  /* Tudo o que falta sai de uma vez: a pessoa corrige numa mensagem só. */
  it('lists everything that is missing at once', () => {
    const result = parseIntakeReply(buildIntakeForm({ ...sistema, phone: null }), {
      ...sistema,
      phone: null,
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toHaveLength(6);
  });

  it('refuses an option number that is not on the list', () => {
    const reply = filled(['Nome: Bia', 'Setor: 99', 'Tipo: 0', 'Descrição: Não imprime.']);

    const result = parseIntakeReply(reply, infra);

    expect(!result.ok && result.errors.join(' ')).toMatch(/setor.*tipo/s);
  });

  /* Tipo de outra área não vale: "Bug" é de Sistema, e este chamado é de Infraestrutura. */
  it('refuses a type that belongs to another area', () => {
    const reply = filled(['Nome: Bia', 'Setor: 6', 'Tipo: Bug', 'Descrição: Não imprime.']);

    expect(parseIntakeReply(reply, infra).ok).toBe(false);
  });

  it('refuses free text that is not the form (edge case)', () => {
    const result = parseIntakeReply('oi, minha impressora quebrou', infra);

    expect(result.ok).toBe(false);
  });
});

describe('area choice', () => {
  // feliz
  it('numbers the areas and reads the choice by number or by name', () => {
    expect(buildAreaOptions(['infra', 'manutencao'])).toBe('1 Infraestrutura\n2 Manutenção');
    expect(parseAreaChoice(' 2 ', ['infra', 'manutencao'])).toBe('manutencao');
    expect(parseAreaChoice('infraestrutura', ['infra', 'manutencao'])).toBe('infra');
    expect(parseAreaChoice('Manutencao', ['infra', 'manutencao'])).toBe('manutencao');
  });

  // triste
  /* Só as áreas que aquele responsável atende: "3" não existe numa lista de duas. */
  it('answers null for a choice that is not offered', () => {
    expect(parseAreaChoice('3', ['infra', 'manutencao'])).toBeNull();
    expect(parseAreaChoice('sistema', ['infra', 'manutencao'])).toBeNull();
    expect(parseAreaChoice('', ['infra'])).toBeNull();
  });
});
