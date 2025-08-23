ALTER TABLE "enrollments" ADD COLUMN "is_reassignment" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "parent_enrollment_id" text;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "reassignment_reason" text;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "reassigned_at" timestamp;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "reassigned_by" text;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_parent_enrollment_id_enrollments_id_fk" FOREIGN KEY ("parent_enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_reassigned_by_user_id_fk" FOREIGN KEY ("reassigned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;