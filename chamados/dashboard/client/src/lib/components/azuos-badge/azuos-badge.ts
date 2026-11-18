/**
 * A porta de entrada do `ui/badge` para os componentes de feature, que não podem importar
 * `lib/components/ui`. Para a situação de um registro, o certo é o `AzuosStatusBadge`.
 */
export { Badge, badgeVariants, type BadgeProps, type BadgeVariant } from '$lib/components/ui/badge';
