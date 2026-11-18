<script lang="ts">
  import { type UploadAvatarInput } from '$lib/utils/avatar-image.util';

  import { useAvatarEditorModel, type AvatarEditorModel } from './use-avatar-editor.svelte';

  /** O model precisa de um componente para existir — mesmo apoio dos outros models. */
  let {
    upload,
    onUploaded,
    onReady,
  }: {
    upload: (input: UploadAvatarInput) => Promise<string | null>;
    onUploaded: () => Promise<void> | void;
    onReady: (model: AvatarEditorModel) => void;
  } = $props();

  onReady(useAvatarEditorModel({ upload, onUploaded }));
</script>
