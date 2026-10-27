<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import { type FormFieldState } from '$lib/types/form-field.type';
  import OpenTicketForm, { type OpenTicketField } from './azuos-open-ticket-form.svelte';

  const field = (value: string, error: string | null = null): FormFieldState => ({ value, error });

  const emptyFields: Record<OpenTicketField, FormFieldState> = {
    requesterName: field(''),
    /* Vazia de propósito: é a primeira escolha de verdade, numa etapa própria de cards. */
    area: field(''),
    department: field('analyze'),
    problemType: field('network'),
    anydeskId: field(''),
    priority: field('medium'),
    contactPhone: field(''),
    description: field(''),
    projectId: field(''),
    customSystemName: field(''),
    assigneeId: field(''),
  };

  const filledFields: Record<OpenTicketField, FormFieldState> = {
    requesterName: field('Bia Costa'),
    area: field('infra'),
    department: field('financeiro'),
    problemType: field('printer'),
    anydeskId: field('111 222 333'),
    priority: field('high'),
    contactPhone: field('62 99999-9999'),
    description: field('A impressora da sala não puxa papel.'),
    projectId: field(''),
    customSystemName: field(''),
    assigneeId: field(''),
  };

  const actions = {
    onChange: () => {},
    onBlur: () => {},
    onNotifyChange: () => {},
    onScreenshotChange: () => {},
    onAttachmentsChange: () => {},
    onAttachmentError: () => {},
    onSubmit: () => {},
    onOpenAnother: () => {},
  };

  const { Story } = defineMeta({
    title: 'Features/Support/AzuosOpenTicketForm',
    component: OpenTicketForm,
  });
</script>

<Story
  name="Default"
  args={{
    data: { fields: emptyFields, notifyWhatsapp: false, screenshotName: null,
    attachments: [], opened: null },
    state: {},
    actions,
  }}
/>

<Story
  name="Filled"
  args={{
    data: { fields: filledFields, notifyWhatsapp: true, screenshotName: null,
    attachments: [], opened: null },
    state: {},
    actions,
  }}
/>

<!-- #13: área Manutenção — o tipo de problema vem de outra lista, sem "rede caiu". -->
<Story
  name="MaintenanceArea"
  args={{
    data: {
      fields: {
        ...filledFields,
        area: field('manutencao'),
        problemType: field('air_conditioning'),
      },
      notifyWhatsapp: false,
      screenshotName: null,
      attachments: [],
      opened: null,
    },
    state: {},
    actions,
  }}
/>

<!-- Sistema fora da lista: a pessoa digitou o nome, e o print veio colado com Ctrl+V. -->
<Story
  name="SystemAreaTypedSystem"
  args={{
    data: {
      fields: {
        ...filledFields,
        area: field('sistema'),
        problemType: field('bug'),
        customSystemName: field('Planilha do financeiro'),
      },
      notifyWhatsapp: false,
      screenshotName: 'print-colado-14-05-09.png',
      attachments: [],
      opened: null,
      systemProjects: [
        { value: '1', label: 'Paralegal' },
        { value: '2', label: 'Gestão RH' },
      ],
    },
    state: {},
    actions,
  }}
/>

<!-- O erro fica colado no campo, nunca num resumo no topo. -->
<Story
  name="WithValidationErrors"
  args={{
    data: {
      fields: {
        ...emptyFields,
        /* A área é a PRIMEIRA validação que aparece — a pessoa vê isso sem nem clicar em
           "Avançar" (ver `missingRequiredFields`). As de baixo aparecem ao avançar. */
        area: field('', 'Escolha a área do chamado'),
        requesterName: field('', 'Informe seu nome'),
        contactPhone: field('99999', 'Informe o WhatsApp com DDD'),
        description: field('', 'Descreva o problema'),
      },
      notifyWhatsapp: false,
      screenshotName: null,
    attachments: [],
      opened: null,
    },
    state: {},
    actions,
  }}
/>

<Story
  name="Submitting"
  args={{
    data: { fields: filledFields, notifyWhatsapp: true, screenshotName: null,
    attachments: [], opened: null },
    state: { isSubmitting: true },
    actions,
  }}
/>

<Story
  name="WithScreenshotChosen"
  args={{
    data: {
      fields: filledFields,
      notifyWhatsapp: false,
      screenshotName: 'erro-da-impressora.png',
      attachments: [],
      opened: null,
    },
    state: {},
    actions,
  }}
/>

<!-- #13: escolheu um arquivo que não é imagem — a recusa aparece NA ESCOLHA, antes do envio. -->
<Story
  name="ScreenshotRefused"
  args={{
    data: {
      fields: filledFields,
      notifyWhatsapp: false,
      screenshotName: null,
      attachments: [],
      opened: null,
    },
    state: { screenshotError: 'O print precisa ser uma imagem (PNG, JPG, WEBP, GIF ou BMP).' },
    actions,
  }}
/>

<Story
  name="ServerRefused"
  args={{
    data: { fields: filledFields, notifyWhatsapp: false, screenshotName: null,
    attachments: [], opened: null },
    state: { error: 'O print precisa ser uma imagem (PNG, JPG ou WEBP).' },
    actions,
  }}
/>

<!-- Depois de abrir, o formulário sai da tela: o protocolo é o que a pessoa precisa levar. -->
<Story
  name="Opened"
  args={{
    data: {
      fields: emptyFields,
      notifyWhatsapp: false,
      screenshotName: null,
    attachments: [],
      opened: { protocol: 'CH-0013', whatsAppLink: null },
    },
    state: {},
    actions,
  }}
/>

<!-- Chegou pelo link do WhatsApp: o aviso de com quem está falando, e só as áreas dessa pessoa. -->
<Story
  name="FromWhatsAppLink"
  args={{
    data: {
      fields: emptyFields,
      notifyWhatsapp: true,
      screenshotName: null,
      attachments: [],
      opened: null,
      invite: { assigneeName: 'Ana Lima', areas: ['infra', 'manutencao'] },
    },
    state: {},
    actions,
  }}
/>

<!-- Nome comprido no celular: o aviso quebra linha e mantém espaço até a escolha da área. -->
<Story
  name="FromWhatsAppLinkMobile"
  globals={{ viewport: { value: 'celular' } }}
  args={{
    data: {
      fields: emptyFields,
      notifyWhatsapp: true,
      screenshotName: null,
      attachments: [],
      opened: null,
      invite: {
        assigneeName: 'Ana Mariana da Equipe de Atendimento',
        areas: ['infra', 'sistema', 'manutencao'],
      },
    },
    state: {},
    actions,
  }}
/>

<!-- Caso limite: o link venceu. O formulário abre normal, com um aviso. -->
<Story
  name="ExpiredWhatsAppLink"
  args={{
    data: {
      fields: emptyFields,
      notifyWhatsapp: false,
      screenshotName: null,
      attachments: [],
      opened: null,
    },
    state: { inviteError: 'Este link não vale mais. Peça outro pelo WhatsApp.' },
    actions,
  }}
/>

<!-- Com responsáveis para escolher: o campo aparece no último passo ("Como te avisamos"). -->
<Story
  name="WithAssignees"
  args={{
    data: {
      fields: emptyFields,
      notifyWhatsapp: true,
      screenshotName: null,
      attachments: [],
      opened: null,
      assignees: [
        { value: 'u-ana', label: 'Ana Lima' },
        { value: 'u-bia', label: 'Bia Costa' },
      ],
    },
    state: {},
    actions,
  }}
/>

<!-- Com pessoas para vincular: o campo aparece no último passo, com uma já escolhida. -->
<Story
  name="WithPeopleToLink"
  args={{
    data: {
      fields: emptyFields,
      notifyWhatsapp: false,
      screenshotName: null,
      attachments: [],
      opened: null,
      watcherIds: ['u-caio'],
      peopleOptions: [
        { id: 'u-caio', name: 'Caio Reis' },
        { id: 'u-dani', name: 'Dani Alves' },
      ],
    },
    state: {},
    actions: { ...actions, onWatchersChange: () => {} },
  }}
/>

<Story
  name="OpenedWithWhatsApp"
  args={{
    data: {
      fields: emptyFields,
      notifyWhatsapp: true,
      screenshotName: null,
    attachments: [],
      opened: { protocol: 'CH-0013', whatsAppLink: 'https://wa.me/5562999999999?text=Protocolo' },
    },
    state: {},
    actions,
  }}
/>

<!-- O bot já mandou o protocolo: a tela avisa e não oferece o link. -->
<Story
  name="OpenedAndSentByBot"
  args={{
    data: {
      fields: emptyFields,
      notifyWhatsapp: true,
      screenshotName: null,
      attachments: [],
      opened: {
        protocol: 'CH-0013',
        whatsAppLink: 'https://wa.me/5562999999999?text=Protocolo',
        isNoticeSent: true,
      },
    },
    state: {},
    actions,
  }}
/>

<!-- Departamento fora da lista: a pessoa digitou o nome, e o campo mostra o texto como veio. -->
<Story
  name="TypedDepartment"
  args={{
    data: {
      fields: { ...filledFields, department: field('Societário') },
      notifyWhatsapp: false,
      screenshotName: null,
      attachments: [],
      opened: null,
      departmentOptions: [
        { value: 'ANALYZE', label: 'ANALYZE' },
        { value: 'CERTIFICADO', label: 'CERTIFICADO' },
        { value: 'RECEPÇÃO', label: 'RECEPÇÃO' },
      ],
    },
    state: {},
    actions,
  }}
/>
