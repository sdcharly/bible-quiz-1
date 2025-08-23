ALTER TABLE "quizzes" ADD COLUMN "time_configuration" jsonb;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "scheduling_status" text DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "scheduled_by" text;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "scheduled_at" timestamp;