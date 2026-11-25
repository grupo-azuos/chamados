<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import Component from './azuos-hint.svelte';

  /** A dica no balão do projeto: o texto inteiro do que aparece cortado. Passe o mouse. */
  const { Story } = defineMeta({ title: 'Components/AzuosHint', component: Component, tags: ['autodocs'] });
</script>

<Story name="Default" args={{ data: { text: 'Contratos: seletor de parte, telas, contratos salvos, máscaras e leitura de documentos' } }}>
  {#snippet template(args)}
    <Component {...args}>
      {#snippet child(props)}
        <span {...props} class="bg-card shadow-card rounded-box inline-block w-48 truncate px-3 py-2 text-sm">
          Contratos: seletor de parte, telas, contratos salvos
        </span>
      {/snippet}
    </Component>
  {/snippet}
</Story>
