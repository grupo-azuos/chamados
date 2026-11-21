<script lang="ts">
  import ExpandableScreen from './azuos-expandable-screen.svelte';

  let { isOpen, onClose, withFooter = false }: { isOpen: boolean; onClose: () => void; withFooter?: boolean } = $props();
</script>

{#snippet footer()}<button type="button">Salvar</button>{/snippet}

<ExpandableScreen
  data={{ title: 'Montar o painel', description: 'Arraste os blocos.' }}
  state={{ isOpen }}
  actions={{ onClose }}
  footer={withFooter ? footer : undefined}
>
  <p>Conteúdo da tela</p>
</ExpandableScreen>
