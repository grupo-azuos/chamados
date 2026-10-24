<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";

	import SelectField from "$lib/components/azuos-select-field/azuos-select-field.svelte";

	/* O ano do calendário na lista do PROJETO, nunca no `<select>` nativo (regra do grupo). */
	let {
		value,
		onValueChange,
		...restProps
	}: Omit<CalendarPrimitive.YearSelectProps, "child" | "children" | "value"> & {
		value?: number;
		onValueChange: (year: number) => void;
	} = $props();
</script>

<CalendarPrimitive.YearSelect {...restProps}>
	{#snippet child({ yearItems, selectedYearItem })}
		<SelectField
			data={{
				value: String(value ?? selectedYearItem.value),
				options: yearItems.map((item) => ({ value: String(item.value), label: item.label })),
			}}
			ui={{ ariaLabel: "Ano", className: "h-8 tabular-nums" }}
			actions={{ onChange: (next) => onValueChange(Number(next)) }}
		/>
	{/snippet}
</CalendarPrimitive.YearSelect>
