<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import WhatsappTemplatesDialog, {
    type AcerolaWhatsappTemplatesDialogProps,
  } from './acerola-whatsapp-templates-dialog.svelte';

  const actions = { onSelect: fn(), onDraftChange: fn(), onSave: fn(), onRestore: fn(), onClose: fn() };

  const ready = {
    key: 'ticket_ready' as const,
    label: 'Chamado pronto',
    description: 'Enviada quando quem atende clica em avisar que o chamado ficou pronto.',
    variables: ['nome', 'protocolo', 'area', 'responsavel', 'solucao', 'link'],
    body: 'Olá, {{nome}}! O seu chamado *{{protocolo}}* foi finalizado.',
    defaultBody: 'Olá, {{nome}}! O seu chamado *{{protocolo}}* foi finalizado.',
    isCustomized: false,
  };
  const opened = { ...ready, key: 'ticket_opened' as const, label: 'Chamado aberto' };

  const data: AcerolaWhatsappTemplatesDialogProps['data'] = {
    templates: [opened, ready],
    selected: ready,
    draft: ready.body,
    preview: 'Olá, Bia Costa! O seu chamado *CH-0042* foi finalizado.',
  };

  const { Story } = defineMeta({
    title: 'Features/Profile/AcerolaWhatsappTemplatesDialog',
    component: WhatsappTemplatesDialog,
  });
</script>

<Story name="Default" args={{ data, state: { isOpen: true }, actions }} />

<!-- O texto mudou e está certo: dá para salvar. -->
<Story
  name="Edited"
  args={{
    data: { ...data, draft: 'Pronto, {{nome}}!', preview: 'Pronto, Bia Costa!' },
    state: { isOpen: true, canSave: true },
    actions,
  }}
/>

<!-- Variável que não existe: o erro aparece embaixo do campo e salvar fica travado. -->
<Story
  name="UnknownVariable"
  args={{
    data: { ...data, draft: 'Olá {{var}}', preview: 'Olá {{var}}' },
    state: {
      isOpen: true,
      canSave: false,
      draftError: 'Estas variáveis não existem para esta mensagem: {{var}}',
    },
    actions,
  }}
/>

<!-- Texto já editado: aparece o botão de restaurar o original. -->
<Story
  name="Customized"
  args={{
    data: { ...data, selected: { ...ready, isCustomized: true } },
    state: { isOpen: true, isSaved: true },
    actions,
  }}
/>

<Story
  name="Loading"
  args={{
    data: { templates: [], selected: null, draft: '', preview: '' },
    state: { isOpen: true, isLoading: true },
    actions,
  }}
/>

<!-- Caso limite: a lista não chegou. -->
<Story
  name="FailedToLoad"
  args={{
    data: { templates: [], selected: null, draft: '', preview: '' },
    state: { isOpen: true, error: 'Só o super admin vê e edita os textos.' },
    actions,
  }}
/>
