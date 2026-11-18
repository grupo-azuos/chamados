<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import { toPasswordStrength } from '$lib/utils/password-strength.util';

  import Meter from './azuos-password-strength-meter.svelte';

  const { Story } = defineMeta({
    title: 'Components/AzuosPasswordStrengthMeter',
    component: Meter,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Empty" args={{ data: { strength: toPasswordStrength('') } }} />
<Story name="Weak" args={{ data: { strength: toPasswordStrength('abcdef') } }} />
<Story name="Fair" args={{ data: { strength: toPasswordStrength('abcdef12') } }} />
<Story name="Strong" args={{ data: { strength: toPasswordStrength('Cavalo-Bateria-42') } }} />
