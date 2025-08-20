CREATE TABLE "educator_students" (
	"id" text PRIMARY KEY NOT NULL,
	"educator_id" text NOT NULL,
	"student_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"educator_id" text NOT NULL,
	"quiz_id" text,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "educator_students" ADD CONSTRAINT "educator_students_educator_id_user_id_fk" FOREIGN KEY ("educator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "educator_students" ADD CONSTRAINT "educator_students_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_educator_id_user_id_fk" FOREIGN KEY ("educator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;