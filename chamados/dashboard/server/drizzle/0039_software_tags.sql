CREATE TABLE "chamados"."software_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"sha" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chamados"."software_tags" ADD CONSTRAINT "software_tags_project_id_software_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "chamados"."software_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "software_tags_name_unique" ON "chamados"."software_tags" USING btree ("project_id","name");