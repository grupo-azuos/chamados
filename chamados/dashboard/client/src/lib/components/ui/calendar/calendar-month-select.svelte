<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";

	import SelectField from "$lib/components/azuos-select-field/azuos-select-field.svelte";

	/*
	 * O mês do calendário na lista do PROJETO, nunca no `<select>` nativo: o menu do sistema
	 * operacional é diferente em cada máquina, e regra do grupo proíbe select nativo.
	 */
	let {
		value,
		onValueChange,
		...restProps
	}: Omit<CalendarPrimitive.MonthSelectProps, "child" | "children" | "value"> & {
		value?: number;
		onValueChange: (month: number) => void;
	} = $props();
</script>

<CalendarPrimitive.MonthSelect {...restProps}>
	{#snippet child({ monthItems, selectedMonthItem })}
		<SelectField
			data={{
				value: String(value ?? selectedMonthItem.value),
				options: monthItems.map((item) => ({ value: String(item.value), label: item.label })),
			}}
			ui={{ ariaLabel: "Mês", className: "h-8 capitalize" }}
			actions={{ onChange: (next) => onValueChange(Number(next)) }}
		/>
	{/snippet}
</CalendarPrimitive.MonthSelect>
