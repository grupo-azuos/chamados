CREATE TABLE "chamados"."dashboard_boards" (
	"id" serial PRIMARY KEY NOT NULL,
	"module" text NOT NULL,
	"scope" text NOT NULL,
	"owner_id" text,
	"widgets" jsonb NOT NULL,
	"layout" jsonb NOT NULL,
	"filters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "dashboard_boards_module_scope_owner" UNIQUE NULLS NOT DISTINCT("module","scope","owner_id")
);
--> statement-breakpoint
CREATE TABLE "chamados"."saved_filters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"source" text NOT NULL,
	"scope" text NOT NULL,
	"tree" jsonb NOT NULL,
	"owner_id" text NOT NULL,
	"owner_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text
);
--> statement-breakpoint
CREATE INDEX "saved_filters_module_idx" ON "chamados"."saved_filters" USING btree ("module");--> statement-breakpoint
CREATE INDEX "saved_filters_owner_idx" ON "chamados"."saved_filters" USING btree ("owner_id");