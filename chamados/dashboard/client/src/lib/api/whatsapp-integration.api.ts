import { type WhatsappConnection } from '@template/shared/schemas/whatsapp-connection.schema';

import {
  type UpdateWhatsappTemplateInput,
  type WhatsappTemplate,
} from '@template/shared/schemas/whatsapp-template.schema';

import { apiRequest } from './http-client';

/** O vínculo de WhatsApp de quem está logado — nunca o de outra pessoa (a API não aceita id). */
export const whatsappIntegrationApi = {
  status: () => apiRequest<WhatsappConnection>('/integrations/whatsapp/status'),
  link: () => apiRequest<WhatsappConnection>('/integrations/whatsapp/link', { method: 'POST' }),
  unlink: () => apiRequest<void>('/integrations/whatsapp', { method: 'DELETE' }),

  /** Os textos do bot — só o super admin. */
  templates: () => apiRequest<WhatsappTemplate[]>('/integrations/whatsapp/templates'),
  updateTemplate: (key: string, body: UpdateWhatsappTemplateInput) =>
    apiRequest<WhatsappTemplate>(`/integrations/whatsapp/templates/${key}`, {
      method: 'PATCH',
      body,
    }),
  /** Restaurar devolve a mensagem já com o texto original. */
  restoreTemplate: (key: string) =>
    apiRequest<WhatsappTemplate>(`/integrations/whatsapp/templates/${key}`, { method: 'DELETE' }),
};
