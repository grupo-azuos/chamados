<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ExpandableScreen from './azuos-expandable-screen.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosExpandableScreen',
    component: ExpandableScreen,
    parameters: { layout: 'fullscreen' },
  });
</script>

<Story name="Default" args={{ data: { title: 'Montar o painel Equipe', description: 'Arraste um bloco da lateral para uma casa da grade.' }, state: { isOpen: true }, actions: { onClose: () => {} } }}>
  {#snippet template(args)}
    <ExpandableScreen data={args.data} state={args.state} actions={args.actions}>
      <div class="p-6"><p class="text-ink-700 text-sm">O conteúdo que não cabe num diálogo.</p></div>
    </ExpandableScreen>
  {/snippet}
</Story>

<Story name="Com rodapé" args={{ data: { title: 'Montar filtro' }, state: { isOpen: true }, actions: { onClose: () => {} } }}>
  {#snippet template(args)}
    <ExpandableScreen data={args.data} state={args.state} actions={args.actions}>
      {#snippet footer()}<button type="button" class="rounded-button bg-primary text-primary-foreground control-md px-4">Salvar</button>{/snippet}
      <div class="p-6"><p class="text-ink-700 text-sm">Com as ações presas embaixo.</p></div>
    </ExpandableScreen>
  {/snippet}
</Story>

<!-- Caso limite: fechada, não desenha nada. -->
<Story name="Fechada" args={{ data: { title: 'Fechada' }, state: { isOpen: false }, actions: { onClose: () => {} } }}>
  {#snippet template(args)}<ExpandableScreen data={args.data} state={args.state} actions={args.actions}><p>Nada aparece.</p></ExpandableScreen>{/snippet}
</Story>
