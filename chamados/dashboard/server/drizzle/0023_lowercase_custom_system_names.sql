-- Sistema só tem um nome: "Trilha", "trilha" e " TRILHA " são o mesmo. O nome DIGITADO (o
-- sistema que não estava na lista) passa a ser gravado sempre igual — sem espaço nas pontas,
-- um espaço só entre as palavras e em minúsculas —, a mesma regra do `normalizeSystemName`
-- (shared/src/domain/system-name.util.ts). Aqui o que já estava gravado ganha a mesma forma;
-- o que ficar vazio volta a ser "sem sistema" (nulo). Os sistemas CADASTRADOS não mudam.
-- Idempotente: rodar de novo não acha nada diferente da forma limpa.
UPDATE "chamados"."tickets"
  SET "custom_system_name" = nullif(lower(btrim(regexp_replace("custom_system_name", '\s+', ' ', 'g'))), '')
  WHERE "custom_system_name" IS NOT NULL
    AND "custom_system_name" IS DISTINCT FROM nullif(lower(btrim(regexp_replace("custom_system_name", '\s+', ' ', 'g'))), '');
