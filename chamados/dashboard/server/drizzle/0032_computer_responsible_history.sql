CREATE TABLE "chamados"."computer_responsible_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"computer_id" integer NOT NULL,
	"responsible_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "chamados"."computer_responsible_history" ADD CONSTRAINT "computer_responsible_history_computer_id_computers_id_fk" FOREIGN KEY ("computer_id") REFERENCES "chamados"."computers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "computer_responsible_open_unique" ON "chamados"."computer_responsible_history" USING btree ("computer_id") WHERE "chamados"."computer_responsible_history"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "computer_responsible_person_idx" ON "chamados"."computer_responsible_history" USING btree ("responsible_id");