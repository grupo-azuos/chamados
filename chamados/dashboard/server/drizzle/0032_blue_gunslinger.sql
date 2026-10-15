CREATE TABLE "super_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "internal_roles" DROP CONSTRAINT "internal_roles_role_valid";--> statement-breakpoint
CREATE UNIQUE INDEX "super_admins_user_email_idx" ON "super_admins" USING btree ("user_email");--> statement-breakpoint
ALTER TABLE "internal_roles" DROP COLUMN "role";