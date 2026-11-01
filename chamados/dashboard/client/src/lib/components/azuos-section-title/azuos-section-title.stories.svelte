<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import ShieldAlert from '@lucide/svelte/icons/shield-alert';
  import UserRound from '@lucide/svelte/icons/user-round';

  import SectionTitle from './azuos-section-title.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosSectionTitle',
    component: SectionTitle,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  args={{
    data: { title: 'Dados pessoais', description: 'Nome e contato de quem usa o sistema' },
    ui: { icon: UserRound },
  }}
/>

<!-- A zona de perigo: o vermelho avisa antes do botão. -->
<Story
  name="Danger"
  args={{
    data: { title: 'Zona de perigo', description: 'O que não tem volta' },
    ui: { icon: ShieldAlert, tone: 'danger' },
  }}
/>

<!-- Com a contagem dentro do título. -->
<Story name="WithAdornment">
  <SectionTitle data={{ title: 'Sistemas' }} ui={{ icon: UserRound }}>
    {#snippet adornment()}
      <span class="bg-muted text-muted-foreground rounded-chip px-2 text-xs">3</span>
    {/snippet}
  </SectionTitle>
</Story>

<!-- Caso limite: título e explicação compridos num celular. -->
<Story name="LongOnPhone">
  <div class="w-[320px]">
    <SectionTitle
      data={{
        title: 'Organização, cargo e departamento da pessoa',
        description: 'Vem do RH: para mudar, abra um chamado na Central de Chamados',
      }}
      ui={{ icon: UserRound }}
    />
  </div>
</Story>
