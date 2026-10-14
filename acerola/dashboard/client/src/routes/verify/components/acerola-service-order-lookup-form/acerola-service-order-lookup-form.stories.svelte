<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ServiceOrderLookupForm from './acerola-service-order-lookup-form.svelte';

  const { Story } = defineMeta({
    title: 'Features/Verify/AcerolaServiceOrderLookupForm',
    component: ServiceOrderLookupForm,
  });

  const actions = { onChange: () => {}, onSubmit: () => {} };
</script>

<!-- Recém-aberta: o campo vazio, esperando o código. -->
<Story name="Default" args={{ data: { code: '' }, actions }} />

<!-- Dado INVENTADO: nenhum código daqui existe. -->
<Story name="Filled" args={{ data: { code: 'a1b2c3d4e5f6' }, actions }} />

<Story
  name="Invalid code"
  args={{
    data: { code: 'a1b2' },
    state: {
      error: 'Digite o código do rodapé do documento: pelo menos 12 letras e números.',
    },
    actions,
  }}
/>

<!-- Caso limite: o código inteiro colado do link, que é bem mais longo que o do papel. -->
<Story
  name="Full code pasted"
  args={{
    data: { code: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90' },
    actions,
  }}
/>
