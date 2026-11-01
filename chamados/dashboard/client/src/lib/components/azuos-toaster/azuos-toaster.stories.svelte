<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ActionButton from '$lib/components/azuos-action-button/azuos-action-button.svelte';
  import { useNotice } from '$lib/hooks/use-notice/use-notice';

  import Toaster from './azuos-toaster.svelte';

  const notice = useNotice();

  const { Story } = defineMeta({
    title: 'Components/AzuosToaster',
    component: Toaster,
    parameters: { layout: 'padded' },
  });
</script>

<!-- Clique para ver o aviso comum e o de falha. -->
<Story name="Default" asChild>
  <Toaster />
  <div class="flex gap-2">
    <ActionButton data={{ label: 'Aviso comum' }} actions={{ onClick: () => notice.show('Chamado aberto.') }} />
    <ActionButton
      data={{ label: 'Aviso de falha' }}
      ui={{ variant: 'danger' }}
      actions={{ onClick: () => notice.show('Não foi possível salvar.', 'danger') }}
    />
  </div>
</Story>

<!-- No alto, centralizado. -->
<Story name="TopCenter" asChild>
  <Toaster ui={{ position: 'top-center' }} />
  <ActionButton data={{ label: 'Avisar' }} actions={{ onClick: () => notice.show('Manutenção registrada.') }} />
</Story>
