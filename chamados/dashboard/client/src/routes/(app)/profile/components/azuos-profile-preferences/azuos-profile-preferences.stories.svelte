<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ProfilePreferences from './azuos-profile-preferences.svelte';

  const { Story } = defineMeta({ title: 'Features/Profile/AzuosProfilePreferences', component: ProfilePreferences });
</script>

<Story name="Default" />
<Story name="Mobile" asChild>
  <div class="mx-auto w-full max-w-sm">
    <ProfilePreferences />
  </div>
</Story>
