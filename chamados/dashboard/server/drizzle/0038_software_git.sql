CREATE TABLE "chamados"."software_branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"head_sha" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_push_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "chamados"."software_commits" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"sha" text NOT NULL,
	"parents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"message" text NOT NULL,
	"author_login" text,
	"author_name" text NOT NULL,
	"committed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chamados"."software_branches" ADD CONSTRAINT "software_branches_project_id_software_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "chamados"."software_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chamados"."software_commits" ADD CONSTRAINT "software_commits_project_id_software_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "chamados"."software_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "software_branches_name_unique" ON "chamados"."software_branches" USING btree ("project_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "software_commits_sha_unique" ON "chamados"."software_commits" USING btree ("project_id","sha");--> statement-breakpoint
CREATE INDEX "software_commits_date_idx" ON "chamados"."software_commits" USING btree ("project_id","committed_at");