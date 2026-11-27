-- A DESCRIÇÃO DAS TABELAS QUE AINDA NÃO TINHAM — o que aparece ao lado do nome no DBeaver. As
-- outras ganharam a dela quando nasceram, e a levaram junto na mudança de schema.
-- Escrita à mão (`generate --custom`): o `drizzle-kit` não gera COMMENT. Não muda dado nenhum.
COMMENT ON TABLE "inventory"."computer_responsible_history" IS 'Quem já teve cada computador: um período por responsável (aberto é o atual). Quem grava é um gatilho no banco.';--> statement-breakpoint
COMMENT ON TABLE "dashboard"."dashboard_boards" IS 'Dashboards montados por módulo: um da equipe, um da gestão e um por pessoa em cada módulo.';--> statement-breakpoint
COMMENT ON TABLE "dashboard"."saved_filters" IS 'Filtros salvos dos dashboards de cada módulo, pessoais ou da equipe. Não se apagam: arquivam.';--> statement-breakpoint
COMMENT ON TABLE "software"."github_webhook_events" IS 'Cada aviso do GitHub como chegou, guardado antes de processar: trava a repetição e deixa reprocessar.';--> statement-breakpoint
COMMENT ON TABLE "software"."software_commits" IS 'Commits de cada sistema, com os pais, que o grafo do mapa desenha.';--> statement-breakpoint
COMMENT ON TABLE "software"."software_branches" IS 'Branches de cada sistema e o commit em que cada uma está.';--> statement-breakpoint
COMMENT ON TABLE "software"."software_tags" IS 'Tags (versões) de cada sistema: a etiqueta e o commit dela.';--> statement-breakpoint
COMMENT ON TABLE "tasks"."tasks" IS 'Tarefas da equipe de TI, com responsável, prazo, situação e o chamado ou a manutenção de origem.';--> statement-breakpoint
COMMENT ON TABLE "tasks"."task_stages" IS 'Situações próprias das tarefas criadas pela equipe de cada área, com nome e cor.';--> statement-breakpoint
COMMENT ON TABLE "tasks"."task_steps" IS 'O checklist de cada tarefa: marcar a última etapa a finaliza.';--> statement-breakpoint
COMMENT ON TABLE "tasks"."task_links" IS 'A que cada tarefa se liga, vários de cada tipo. Sem chave estrangeira: o alvo mora em tabelas diferentes conforme o tipo.';--> statement-breakpoint
COMMENT ON TABLE "tasks"."task_people" IS 'Quem mais participa de cada tarefa além do responsável, pelo id do diretório de pessoas.';
