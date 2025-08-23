CREATE TABLE "quiz_share_links" (
	"id" text PRIMARY KEY NOT NULL,
	"quiz_id" text NOT NULL,
	"educator_id" text NOT NULL,
	"share_code" text NOT NULL,
	"short_url" text,
	"expires_at" timestamp,
	"click_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_share_links_share_code_unique" UNIQUE("share_code")
);
--> statement-breakpoint
ALTER TABLE "quiz_share_links" ADD CONSTRAINT "quiz_share_links_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_share_links" ADD CONSTRAINT "quiz_share_links_educator_id_user_id_fk" FOREIGN KEY ("educator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;