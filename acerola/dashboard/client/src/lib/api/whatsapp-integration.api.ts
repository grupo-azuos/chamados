import { type WhatsappConnection } from '@template/shared/schemas/whatsapp-connection.schema';

import { apiRequest } from './http-client';

/** O vínculo de WhatsApp de quem está logado — nunca o de outra pessoa (a API não aceita id). */
export const whatsappIntegrationApi = {
  status: () => apiRequest<WhatsappConnection>('/integrations/whatsapp/status'),
  link: () => apiRequest<WhatsappConnection>('/integrations/whatsapp/link', { method: 'POST' }),
  unlink: () => apiRequest<void>('/integrations/whatsapp', { method: 'DELETE' }),
};
