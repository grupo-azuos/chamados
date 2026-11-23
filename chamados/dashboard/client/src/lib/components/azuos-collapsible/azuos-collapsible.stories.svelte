<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import AzuosClearFiltersButton from '$lib/components/azuos-clear-filters-button/azuos-clear-filters-button.svelte';

  import Collapsible from './azuos-collapsible.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosCollapsible',
    component: Collapsible,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" asChild>
  <Collapsible data={{ title: 'Filtros avançados' }}>
    <p>Setor, responsável e período da última manutenção.</p>
  </Collapsible>
</Story>

<Story name="Open" asChild>
  <Collapsible data={{ title: 'Filtros avançados' }} state={{ isOpen: true }}>
    <p>Setor, responsável e período da última manutenção.</p>
  </Collapsible>
</Story>

<!-- Com selo e ação no cabeçalho: o selo diz que há algo dentro mesmo fechado, e a ação ("Limpar
     filtros") fica na ponta direita, fora do botão que abre e fecha — a seta vai para junto do
     título. -->
<Story name="WithBadgeAndAside" asChild>
  <Collapsible data={{ title: 'Filtros', badge: '2 ativos' }} ui={{ className: 'max-w-[32rem]' }} state={{ isOpen: true }}>
    {#snippet aside()}
      <AzuosClearFiltersButton state={{ hasFilter: true }} actions={{ onClear: () => {} }} />
    {/snippet}
    <p>Setor, responsável e período da última manutenção.</p>
  </Collapsible>
</Story>

<Story name="Disabled" asChild>
  <Collapsible data={{ title: 'Filtros avançados' }} state={{ isDisabled: true }}>
    <p>Setor, responsável e período da última manutenção.</p>
  </Collapsible>
</Story>

<!-- Caso limite: título comprido em coluna estreita — quebra linha e a seta não é empurrada. -->
<Story name="LongTitleInNarrowColumn" asChild>
  <Collapsible
    data={{ title: 'Por que esta máquina aparece como travada mesmo estando ligada na tomada' }}
    ui={{ className: 'max-w-[260px]' }}
    state={{ isOpen: true }}
  >
    <p>O agente parou de enviar leituras há mais de dez minutos.</p>
  </Collapsible>
</Story>
