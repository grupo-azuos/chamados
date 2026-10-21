CREATE TABLE "chamados"."maintenance_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"computer_id" integer NOT NULL,
	"scheduled_for" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone,
	"updated_by" text,
	CONSTRAINT "maintenance_schedules_computer_id_unique" UNIQUE("computer_id")
);
--> statement-breakpoint
ALTER TABLE "chamados"."maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "chamados"."computers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maintenance_schedules_scheduled_for_idx" ON "chamados"."maintenance_schedules" USING btree ("scheduled_for");