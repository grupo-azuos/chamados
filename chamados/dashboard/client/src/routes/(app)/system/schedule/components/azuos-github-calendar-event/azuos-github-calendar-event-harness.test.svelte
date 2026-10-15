<script lang="ts">
  import type { SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
  import * as Tooltip from '$lib/components/azuos-tooltip/azuos-tooltip';
  import CalendarEvent from './azuos-github-calendar-event.svelte';
  let { event, compact = false }: { event: SoftwareTimelineEvent; compact?: boolean } = $props();
</script>

<Tooltip.Provider delayDuration={0}><CalendarEvent {event} {compact} /></Tooltip.Provider>
