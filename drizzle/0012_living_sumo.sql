CREATE TABLE "group_enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"quiz_id" text NOT NULL,
	"enrolled_by" text NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"send_notifications" boolean DEFAULT true,
	"excluded_student_ids" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"student_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"is_active" boolean DEFAULT true,
	"added_by" text NOT NULL,
	"removed_at" timestamp,
	"removed_by" text
);
--> statement-breakpoint
CREATE TABLE "student_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"educator_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"theme" text DEFAULT 'biblical' NOT NULL,
	"color" text DEFAULT '#3B82F6',
	"max_size" integer DEFAULT 30,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "group_enrollment_id" text;--> statement-breakpoint
ALTER TABLE "group_enrollments" ADD CONSTRAINT "group_enrollments_group_id_student_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."student_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_enrollments" ADD CONSTRAINT "group_enrollments_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_enrollments" ADD CONSTRAINT "group_enrollments_enrolled_by_user_id_fk" FOREIGN KEY ("enrolled_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_student_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."student_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_added_by_user_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_removed_by_user_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_groups" ADD CONSTRAINT "student_groups_educator_id_user_id_fk" FOREIGN KEY ("educator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_group_enrollment_id_group_enrollments_id_fk" FOREIGN KEY ("group_enrollment_id") REFERENCES "public"."group_enrollments"("id") ON DELETE no action ON UPDATE no action;