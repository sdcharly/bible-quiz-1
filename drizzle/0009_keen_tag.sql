CREATE TABLE "permission_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permission_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "permission_template_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_permission_template_id_permission_templates_id_fk" FOREIGN KEY ("permission_template_id") REFERENCES "public"."permission_templates"("id") ON DELETE no action ON UPDATE no action;