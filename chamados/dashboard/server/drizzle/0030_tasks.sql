CREATE TABLE "chamados"."task_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"kind" text NOT NULL,
	"target_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "task_links_kind_valid" CHECK ("chamados"."task_links"."kind" in ('ticket', 'computer', 'part', 'inventory_item'))
);
--> statement-breakpoint
CREATE TABLE "chamados"."task_people" (
	"task_id" integer NOT NULL,
	"person_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_people_task_id_person_id_pk" PRIMARY KEY("task_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "chamados"."task_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"label" text NOT NULL,
	"position" integer NOT NULL,
	"done_at" timestamp with time zone,
	"done_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_steps_label_not_blank" CHECK (length(btrim("chamados"."task_steps"."label")) > 0),
	CONSTRAINT "task_steps_done_pair" CHECK (("chamados"."task_steps"."done_at" is null) = ("chamados"."task_steps"."done_by" is null))
);
--> statement-breakpoint
CREATE TABLE "chamados"."tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"area" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'open' NOT NULL,
	"origin" text DEFAULT 'manual' NOT NULL,
	"ticket_id" integer,
	"computer_id" integer,
	"owner_id" text,
	"start_date" date NOT NULL,
	"due_date" date,
	"due_time" time(0),
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "tasks_area_valid" CHECK ("chamados"."tasks"."area" in ('infra', 'sistema', 'manutencao')),
	CONSTRAINT "tasks_status_valid" CHECK ("chamados"."tasks"."status" in ('open', 'reopened', 'done')),
	CONSTRAINT "tasks_origin_valid" CHECK ("chamados"."tasks"."origin" in ('manual', 'ticket', 'maintenance')),
	CONSTRAINT "tasks_title_not_blank" CHECK (length(btrim("chamados"."tasks"."title")) > 0),
	CONSTRAINT "tasks_finished_only_done" CHECK ("chamados"."tasks"."finished_at" is null or "chamados"."tasks"."status" = 'done'),
	CONSTRAINT "tasks_due_time_needs_day" CHECK ("chamados"."tasks"."due_time" is null or "chamados"."tasks"."due_date" is not null),
	CONSTRAINT "tasks_due_after_start" CHECK ("chamados"."tasks"."due_date" is null or "chamados"."tasks"."due_date" >= "chamados"."tasks"."start_date"),
	CONSTRAINT "tasks_ticket_origin" CHECK (("chamados"."tasks"."origin" = 'ticket') = ("chamados"."tasks"."ticket_id" is not null)),
	CONSTRAINT "tasks_maintenance_origin" CHECK ("chamados"."tasks"."origin" <> 'maintenance' or "chamados"."tasks"."computer_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "chamados"."task_links" ADD CONSTRAINT "task_links_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "chamados"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."task_people" ADD CONSTRAINT "task_people_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "chamados"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."task_steps" ADD CONSTRAINT "task_steps_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "chamados"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."tasks" ADD CONSTRAINT "tasks_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "chamados"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."tasks" ADD CONSTRAINT "tasks_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "chamados"."computers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_links_target_unique" ON "chamados"."task_links" USING btree ("task_id","kind","target_id");--> statement-breakpoint
CREATE INDEX "task_links_target_idx" ON "chamados"."task_links" USING btree ("kind","target_id");--> statement-breakpoint
CREATE INDEX "task_people_person_idx" ON "chamados"."task_people" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "task_steps_task_idx" ON "chamados"."task_steps" USING btree ("task_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_ticket_unique" ON "chamados"."tasks" USING btree ("ticket_id") WHERE "chamados"."tasks"."ticket_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_open_maintenance_unique" ON "chamados"."tasks" USING btree ("computer_id") WHERE "chamados"."tasks"."origin" = 'maintenance' and "chamados"."tasks"."status" <> 'done';--> statement-breakpoint
CREATE INDEX "tasks_area_status_idx" ON "chamados"."tasks" USING btree ("area","status");--> statement-breakpoint
CREATE INDEX "tasks_owner_idx" ON "chamados"."tasks" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "tasks_due_date_idx" ON "chamados"."tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "tasks_start_date_idx" ON "chamados"."tasks" USING btree ("start_date");