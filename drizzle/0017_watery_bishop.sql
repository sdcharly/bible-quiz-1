CREATE TABLE "educator_activity_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"educator_id" text NOT NULL,
	"last_login_at" timestamp,
	"last_quiz_created_at" timestamp,
	"last_quiz_published_at" timestamp,
	"last_student_added_at" timestamp,
	"last_document_uploaded_at" timestamp,
	"last_dashboard_visit_at" timestamp,
	"total_quizzes" integer DEFAULT 0,
	"total_students" integer DEFAULT 0,
	"total_documents" integer DEFAULT 0,
	"total_logins" integer DEFAULT 0,
	"engagement_score" real DEFAULT 0,
	"risk_level" text DEFAULT 'low',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "educator_reminder_emails" (
	"id" text PRIMARY KEY NOT NULL,
	"educator_id" text NOT NULL,
	"email_type" text NOT NULL,
	"reminder_level" integer DEFAULT 1,
	"trigger_reason" text NOT NULL,
	"activity_metrics_snapshot" jsonb,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"email_subject" text NOT NULL,
	"delivery_status" text DEFAULT 'sent',
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"engagement_after_email" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "educator_activity_metrics" ADD CONSTRAINT "educator_activity_metrics_educator_id_user_id_fk" FOREIGN KEY ("educator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "educator_reminder_emails" ADD CONSTRAINT "educator_reminder_emails_educator_id_user_id_fk" FOREIGN KEY ("educator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;