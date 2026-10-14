import { goto } from '$app/navigation';
import {
  normalizeServiceOrderReference,
  SERVICE_ORDER_SHORT_CODE_LENGTH,
  serviceOrderVerifyPath,
} from '@template/shared/domain/service-order.util';

export const INVALID_CODE_MESSAGE = `Digite o código do rodapé do documento: pelo menos ${SERVICE_ORDER_SHORT_CODE_LENGTH} letras e números.`;

export type ServiceOrderLookupModel = {
  data: { code: string };
  state: { error: string | null };
  actions: {
    onChange: (code: string) => void;
    onSubmit: () => void;
  };
};

/** Para onde o código digitado leva — ou por que ele não pode ser um código. */
export function lookupTargetOf(code: string): { path: string } | { error: string } {
  const reference = normalizeServiceOrderReference(code);
  if (!reference) return { error: INVALID_CODE_MESSAGE };

  return { path: serviceOrderVerifyPath(reference) };
}

/**
 * A ENTRADA da conferência de documentos: quem tem o papel na mão, mas não o link, digita o
 * código do rodapé e cai na mesma conferência do QR code (`/verify/<código>`).
 *
 * O código não é conferido aqui além do formato: quem sabe se ele existe é a página seguinte.
 */
export function useServiceOrderLookupModel(): ServiceOrderLookupModel {
  let code = $state('');
  let error = $state<string | null>(null);

  return {
    get data() {
      return { code };
    },
    get state() {
      return { error };
    },
    actions: {
      onChange: (value) => {
        code = value;
        error = null;
      },
      onSubmit: () => {
        const target = lookupTargetOf(code);
        if ('error' in target) {
          error = target.error;

          return;
        }

        void goto(target.path);
      },
    },
  };
}
