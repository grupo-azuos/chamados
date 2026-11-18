/**
 * A porta de entrada do `ui/checkbox` para os componentes de feature, que não podem importar
 * `lib/components/ui` (é do CLI do shadcn). Variante ou cor própria entram neste invólucro — nunca
 * no `ui/`. Para uma caixa com rótulo, o certo é o `AzuosCheckboxField`.
 */
export { Checkbox } from '$lib/components/ui/checkbox';
