/**
 * A porta de entrada do `ui/input` para os componentes de feature, que não podem importar
 * `lib/components/ui` (é do CLI do shadcn). Para um campo de formulário comum, o certo é o
 * `AzuosTextField` (rótulo, erro e régua de altura prontos); este invólucro existe para o campo que
 * precisa do `<input>` cru.
 */
export { Input } from '$lib/components/ui/input';
