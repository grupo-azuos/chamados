<script lang="ts">
  import type { SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
  import * as Tooltip from '$lib/components/azuos-tooltip/azuos-tooltip';
  import CalendarEvent from './azuos-github-calendar-event.svelte';
  let {
    event,
    compact = false,
    inTimeGrid = false,
  }: { event: SoftwareTimelineEvent; compact?: boolean; inTimeGrid?: boolean } = $props();
</script>

<Tooltip.Provider delayDuration={0}><CalendarEvent {event} {compact} {inTimeGrid} /></Tooltip.Provider>
