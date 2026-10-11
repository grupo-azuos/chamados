import {
  WHATSAPP_TEMPLATE_KEYS,
  WHATSAPP_TEMPLATES,
} from '@template/shared/domain/whatsapp-template.util';
import { type WhatsappTemplate } from '@template/shared/schemas/whatsapp-template.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-whatsapp-templates-harness.test.svelte';
import {
  draftProblemOf,
  TEMPLATE_PREVIEW_VALUES,
  type useWhatsappTemplatesModel,
} from './use-whatsapp-templates.svelte';

type WhatsappTemplatesModel = ReturnType<typeof useWhatsappTemplatesModel>;

vi.mock('$lib/api/whatsapp-integration.api', () => ({
  whatsappIntegrationApi: { templates: vi.fn(), updateTemplate: vi.fn(), restoreTemplate: vi.fn() },
}));

const { whatsappIntegrationApi } = await import('$lib/api/whatsapp-integration.api');

const template: WhatsappTemplate = {
  key: 'ticket_ready',
  label: 'Chamado pronto',
  description: '',
  variables: [...WHATSAPP_TEMPLATES.ticket_ready.variables],
  body: WHATSAPP_TEMPLATES.ticket_ready.defaultBody,
  defaultBody: WHATSAPP_TEMPLATES.ticket_ready.defaultBody,
  isCustomized: false,
};

describe('draftProblemOf', () => {
  // feliz
  it('finds no problem in a text that only uses the variables of the message', () => {
    expect(
      draftProblemOf(template, 'Olá {{nome}}, o chamado *{{protocolo}}* foi finalizado.'),
    ).toBeNull();
  });

  // triste
  it('names the variable that does not exist', () => {
    expect(draftProblemOf(template, 'Olá {{var}}')).toContain('{{var}}');
  });

  it('refuses an empty text and a text that is too long', () => {
    expect(draftProblemOf(template, '   ')).toBe('Escreva o texto da mensagem.');
    expect(draftProblemOf(template, 'x'.repeat(2001))).toContain('2000');
  });

  it('has nothing to say while no message is selected (edge case)', () => {
    expect(draftProblemOf(null, '{{var}}')).toBeNull();
  });
});

describe('TEMPLATE_PREVIEW_VALUES', () => {
  // feliz
  /* Toda variável de toda mensagem precisa de um valor de exemplo, senão a prévia mostra a chave crua. */
  it('has a sample for every variable of every message', () => {
    for (const key of WHATSAPP_TEMPLATE_KEYS) {
      for (const variable of WHATSAPP_TEMPLATES[key].variables) {
        expect(TEMPLATE_PREVIEW_VALUES[variable], `${key}: ${variable}`).toBeTruthy();
      }
    }
  });
});

describe('useWhatsappTemplatesModel', () => {
  const opened: WhatsappTemplate = {
    ...template,
    key: 'ticket_opened',
    label: 'Chamado aberto',
    variables: [...WHATSAPP_TEMPLATES.ticket_opened.variables],
    body: 'Recebi o chamado {{protocolo}}.',
    defaultBody: WHATSAPP_TEMPLATES.ticket_opened.defaultBody,
    isCustomized: true,
  };

  async function mountOpenModel(): Promise<WhatsappTemplatesModel> {
    let model!: WhatsappTemplatesModel;
    render(Harness, { props: { onReady: (ready: WhatsappTemplatesModel) => (model = ready) } });
    model.actions.onOpen();
    await waitFor(() => expect(model.data.selected).not.toBeNull());

    return model;
  }

  beforeEach(() => {
    vi.mocked(whatsappIntegrationApi.templates).mockReset().mockResolvedValue([opened, template]);
    vi.mocked(whatsappIntegrationApi.updateTemplate).mockReset();
    vi.mocked(whatsappIntegrationApi.restoreTemplate).mockReset();
  });

  // feliz
  it('opens on the first message, with its text as the draft and a preview', async () => {
    const model = await mountOpenModel();

    expect(model.data.selected?.key).toBe('ticket_opened');
    expect(model.data.draft).toBe('Recebi o chamado {{protocolo}}.');
    expect(model.data.preview).toBe('Recebi o chamado CH-0042.');
    expect(model.state.canSave).toBe(false);
  });

  it('switches the draft when another message is chosen', async () => {
    const model = await mountOpenModel();

    model.actions.onSelect('ticket_ready');

    await waitFor(() => expect(model.data.selected?.key).toBe('ticket_ready'));
    expect(model.data.draft).toBe(template.body);
  });

  it('saves the edited text and keeps what the server answered', async () => {
    const saved = { ...opened, body: 'Olá {{nome}}!' };
    vi.mocked(whatsappIntegrationApi.updateTemplate).mockResolvedValue(saved);
    const model = await mountOpenModel();

    model.actions.onDraftChange('Olá {{nome}}!');
    await waitFor(() => expect(model.state.canSave).toBe(true));
    model.actions.onSave();

    await waitFor(() => expect(model.state.isSaved).toBe(true));
    expect(whatsappIntegrationApi.updateTemplate).toHaveBeenCalledWith('ticket_opened', {
      body: 'Olá {{nome}}!',
    });
    expect(model.data.selected?.body).toBe('Olá {{nome}}!');
  });

  it('restores the original text', async () => {
    const restored = { ...opened, body: opened.defaultBody, isCustomized: false };
    vi.mocked(whatsappIntegrationApi.restoreTemplate).mockResolvedValue(restored);
    const model = await mountOpenModel();

    model.actions.onRestore();

    await waitFor(() => expect(model.data.draft).toBe(opened.defaultBody));
    expect(whatsappIntegrationApi.restoreTemplate).toHaveBeenCalledWith('ticket_opened');
  });

  // triste
  /* Variável que não existe para a mensagem: salvar fica travado, com o motivo. */
  it('locks saving and says why when the draft uses an unknown variable', async () => {
    const model = await mountOpenModel();

    model.actions.onDraftChange('Olá {{var}}');

    await waitFor(() => expect(model.state.draftError).toContain('{{var}}'));
    expect(model.state.canSave).toBe(false);
  });

  it('shows the refusal of the server when the text cannot be saved', async () => {
    vi.mocked(whatsappIntegrationApi.updateTemplate).mockRejectedValue(
      new ApiError(403, 'Só o super admin vê e edita os textos.'),
    );
    const model = await mountOpenModel();

    model.actions.onDraftChange('Olá {{nome}}!');
    await waitFor(() => expect(model.state.canSave).toBe(true));
    model.actions.onSave();

    await waitFor(() => expect(model.state.error).toBe('Só o super admin vê e edita os textos.'));
    expect(model.state.isSaved).toBe(false);
  });

  it('closing forgets which message was open', async () => {
    const model = await mountOpenModel();
    model.actions.onSelect('ticket_ready');

    model.actions.onClose();

    expect(model.state.isOpen).toBe(false);
  });
});
