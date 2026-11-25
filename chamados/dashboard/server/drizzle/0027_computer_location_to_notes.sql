-- O LOCAL do computador (ANALYZE, CERTIFICADO, RECEPÇÃO) deixa de ser um campo: o departamento
-- é só o oficial, do RH, e o que estava no local vai para a observação — do mesmo jeito que a
-- 0025 guardou o responsável antigo. A 0028 apaga a coluna depois desta.
--
-- Cada máquina com local ganha a linha "Local anterior: <local>" no fim da observação; o que já
-- estava escrito continua lá, em cima. Idempotente: a linha só é acrescentada se ainda não
-- estiver na observação.

UPDATE "chamados"."computers"
  SET "notes" = concat_ws(
    E'\n',
    nullif(btrim("notes"), ''),
    'Local anterior: ' || regexp_replace(btrim("location"), '\s+', ' ', 'g')
  )
  WHERE nullif(btrim("location"), '') IS NOT NULL
    AND position(
      ('Local anterior: ' || regexp_replace(btrim("location"), '\s+', ' ', 'g'))
      IN coalesce("notes", '')
    ) = 0;
