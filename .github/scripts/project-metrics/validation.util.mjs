/** Validações puras; nenhuma regra de domínio lê disco ou executa Git. */
export function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

export function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isText(value) {
  if (typeof value !== 'string' || value !== value.trim()) return false;
  if (!value || /[\r\n]/.test(value)) return false;

  return !['unknown', 'n/a', 'todo', 'pending', 'desconhecido'].includes(value.toLowerCase());
}

export function validateFields(value, fields, label) {
  ensure(isRecord(value), `${label} must be an object`);
  fields.forEach((field) => ensure(Object.hasOwn(value, field), `${label}.${field} is required`));
}

export function validateNullableText(value, label) {
  ensure(value === null || isText(value), `${label} must be null or non-empty text`);
}

export function validateCount(value, label) {
  ensure(
    value === null || (Number.isInteger(value) && value >= 0),
    `${label} must be null or a non-negative integer`,
  );
}

export function validateDate(value, label) {
  if (value === null) return;
  ensure(
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value),
    `${label} must use YYYY-MM-DD`,
  );
  const date = new Date(`${value}T00:00:00.000Z`);
  ensure(
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value,
    `${label} is not a calendar date`,
  );
}

export function validateTextList(value, label) {
  ensure(Array.isArray(value) && value.every(isText), `${label} must be a list of non-empty text`);
}
