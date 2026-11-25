CREATE TABLE "chamados"."task_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"area" text NOT NULL,
	"label" text NOT NULL,
	"color" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	CONSTRAINT "task_stages_area_valid" CHECK ("chamados"."task_stages"."area" in ('infra', 'sistema', 'manutencao')),
	CONSTRAINT "task_stages_color" CHECK ("chamados"."task_stages"."color" ~ '^#[0-9a-f]{6}$'),
	CONSTRAINT "task_stages_not_blank" CHECK (length(btrim("chamados"."task_stages"."label")) > 0)
);
--> statement-breakpoint
ALTER TABLE "chamados"."tasks" ADD COLUMN "stage_id" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "task_stages_label_unique" ON "chamados"."task_stages" USING btree ("area",lower("label")) WHERE "chamados"."task_stages"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "task_stages_area_idx" ON "chamados"."task_stages" USING btree ("area","position");--> statement-breakpoint
ALTER TABLE "chamados"."tasks" ADD CONSTRAINT "tasks_stage_id_task_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "chamados"."task_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_stage_idx" ON "chamados"."tasks" USING btree ("stage_id");--> statement-breakpoint
ALTER TABLE "chamados"."tasks" ADD CONSTRAINT "tasks_stage_not_done" CHECK ("chamados"."tasks"."stage_id" is null or "chamados"."tasks"."status" <> 'done');