import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
  renderWhatsappTemplate,
  unknownTemplateVariables,
  WHATSAPP_TEMPLATE_MAX_LENGTH,
} from '@template/shared/domain/whatsapp-template.util';
import { type WhatsappTemplate } from '@template/shared/schemas/whatsapp-template.schema';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { whatsappIntegrationApi } from '$lib/api/whatsapp-integration.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

const QUERY_KEY = ['whatsapp-templates'];

/**
 * Os valores de mentira da PRÉVIA: mostram como a mensagem fica sem depender de um chamado de
 * verdade. Dado inventado, sempre.
 */
export const TEMPLATE_PREVIEW_VALUES: Record<string, string> = {
  nome: 'Bia Costa',
  protocolo: 'CH-0042',
  area: 'Infraestrutura',
  responsavel: 'Ana Lima',
  solucao: 'Troquei o cabo de rede e testei a conexão.',
  link: 'https://chamados.exemplo.com/support?convite=exemplo',
  validade: '30',
  enviadas: '70',
  limite: '100',
};

/** Por que o texto não pode ser salvo — ou nulo quando pode. A MESMA regra que o servidor aplica. */
export function draftProblemOf(template: WhatsappTemplate | null, draft: string): string | null {
  if (!template) return null;
  if (draft.trim().length === 0) return 'Escreva o texto da mensagem.';
  if (draft.trim().length > WHATSAPP_TEMPLATE_MAX_LENGTH) {
    return `O texto pode ter até ${WHATSAPP_TEMPLATE_MAX_LENGTH} caracteres.`;
  }

  const unknown = unknownTemplateVariables(template.key, draft);
  if (unknown.length === 0) return null;

  return `Estas variáveis não existem para esta mensagem: ${unknown.map((name) => `{{${name}}}`).join(', ')}`;
}

/**
 * A edição dos textos do bot, pelo super admin: escolhe a mensagem, mexe no texto, vê a prévia
 * e salva — ou restaura o original.
 */
export function useWhatsappTemplatesModel() {
  const queryClient = useQueryClient();

  let isOpen = $state(false);
  let selectedKey = $state<string | null>(null);
  let draft = $state('');
  let isSaved = $state(false);

  const query = mirrorStore(
    createQuery(
      writable({ queryKey: QUERY_KEY, queryFn: whatsappIntegrationApi.templates, retry: false }),
    ),
  );

  const templates = $derived(query.current.data ?? []);
  const selected = $derived(
    templates.find((template) => template.key === selectedKey) ?? templates[0] ?? null,
  );

  /* Guarda o que o servidor devolveu e recomeça o rascunho dele: depois de salvar ou restaurar,
     o campo mostra o texto que de fato está valendo. */
  function accept(template: WhatsappTemplate): void {
    queryClient.setQueryData<WhatsappTemplate[]>(QUERY_KEY, (current) =>
      (current ?? []).map((item) => (item.key === template.key ? template : item)),
    );
    draft = template.body;
    isSaved = true;
  }

  const save = mirrorStore(
    createMutation({
      mutationFn: (input: { key: string; body: string }) =>
        whatsappIntegrationApi.updateTemplate(input.key, { body: input.body }),
      onSuccess: accept,
    }),
  );
  const restore = mirrorStore(
    createMutation({ mutationFn: whatsappIntegrationApi.restoreTemplate, onSuccess: accept }),
  );

  function select(key: string): void {
    selectedKey = key;
    draft = templates.find((template) => template.key === key)?.body ?? '';
    isSaved = false;
    save.current.reset();
    restore.current.reset();
  }

  /* A lista chega depois de o diálogo abrir: o rascunho começa pelo texto da primeira mensagem. */
  $effect(() => {
    if (isOpen && selectedKey === null && templates[0]) select(templates[0].key);
  });

  return {
    get data() {
      return {
        templates,
        selected,
        draft,
        preview: renderWhatsappTemplate(draft, TEMPLATE_PREVIEW_VALUES),
      };
    },
    get state() {
      const problem = draftProblemOf(selected, draft);

      return {
        isOpen,
        isLoading: query.current.isPending,
        isSaving: save.current.isPending,
        isRestoring: restore.current.isPending,
        isSaved,
        /* Só há o que salvar quando o texto mudou e não tem problema. */
        canSave: problem === null && selected !== null && draft.trim() !== selected.body,
        draftError: problem,
        error:
          readError(save.current.error) ??
          readError(restore.current.error) ??
          readError(query.current.error),
      };
    },
    actions: {
      onOpen: () => {
        isOpen = true;
      },
      onClose: () => {
        isOpen = false;
        selectedKey = null;
        isSaved = false;
      },
      onSelect: select,
      onDraftChange: (text: string) => {
        draft = text;
        isSaved = false;
      },
      onSave: () => {
        if (selected && !save.current.isPending)
          save.current.mutate({ key: selected.key, body: draft });
      },
      onRestore: () => {
        if (selected && !restore.current.isPending) restore.current.mutate(selected.key);
      },
    },
  };
}
