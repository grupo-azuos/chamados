-- Os chamados de Infraestrutura que já existiam viram tarefas — daqui para frente, abrir um
-- chamado de infra cria a dele na hora. Encerrado vira tarefa finalizada (entra na
-- produtividade do período); aberto fica aberto. Idempotente: chamado com tarefa é pulado.
INSERT INTO "chamados"."tasks"
  ("area", "title", "description", "status", "origin", "ticket_id", "owner_id", "start_date",
   "finished_at", "created_at", "created_by", "updated_at")
SELECT
  'infra',
  left(btrim(regexp_replace(t."description", '\s+', ' ', 'g')), 160),
  t."description",
  CASE WHEN t."status" IN ('resolved', 'resolved_with_caveats', 'cancelled') THEN 'done' ELSE 'open' END,
  'ticket',
  t."id",
  t."assignee_id",
  (t."created_at" AT TIME ZONE 'America/Sao_Paulo')::date,
  CASE
    WHEN t."status" IN ('resolved', 'resolved_with_caveats', 'cancelled')
      THEN coalesce(t."resolved_at", t."updated_at", t."created_at")
  END,
  t."created_at",
  'system',
  coalesce(t."updated_at", t."created_at")
FROM "chamados"."tickets" t
WHERE t."area" = 'infra'
  AND length(btrim(t."description")) > 0
  AND NOT EXISTS (SELECT 1 FROM "chamados"."tasks" k WHERE k."ticket_id" = t."id");
--> statement-breakpoint
-- A máquina do chamado entra como vínculo da tarefa.
INSERT INTO "chamados"."task_links" ("task_id", "kind", "target_id", "created_by")
SELECT k."id", 'computer', t."computer_id", 'system'
FROM "chamados"."tasks" k
JOIN "chamados"."tickets" t ON t."id" = k."ticket_id"
WHERE k."origin" = 'ticket' AND t."computer_id" IS NOT NULL
ON CONFLICT DO NOTHING;
