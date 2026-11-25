<script lang="ts">
  import ExpandableScreen from './azuos-expandable-screen.svelte';

  let {
    isOpen,
    onClose,
    withFooter = false,
    tick = 0,
  }: { isOpen: boolean; onClose: () => void; withFooter?: boolean; tick?: number } = $props();
</script>

{#snippet footer()}<button type="button">Salvar</button>{/snippet}

<ExpandableScreen
  data={{ title: 'Montar o painel', description: 'Arraste os blocos.' }}
  state={tick >= 0 ? { isOpen } : { isOpen }}
  actions={{ onClose }}
  footer={withFooter ? footer : undefined}
>
  <p>Conteúdo da tela</p>
  <input aria-label="Campo da tela" />
</ExpandableScreen>
