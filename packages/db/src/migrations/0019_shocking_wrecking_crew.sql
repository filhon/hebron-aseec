CREATE TYPE "plataforma"."lesson_type" AS ENUM('video', 'text', 'quiz', 'download');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verification_hash" text NOT NULL,
	CONSTRAINT "certificates_verification_hash_unique" UNIQUE("verification_hash"),
	CONSTRAINT "certificates_course_user_uniq" UNIQUE("course_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"cover_url" text,
	"category" text NOT NULL,
	"instructor_id" uuid NOT NULL,
	"series_id" uuid,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."discussion_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discussion_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"parent_post_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."discussions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discussions_lesson_id_unique" UNIQUE("lesson_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "enrollments_user_course_uniq" UNIQUE("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."instructors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"avatar_url" text,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "plataforma"."lesson_type" NOT NULL,
	"order" integer NOT NULL,
	"video_url" text,
	"video_duration_seconds" integer,
	"content" text,
	"download_url" text,
	"download_file_name" text,
	"download_file_size_bytes" integer,
	"next_lesson_id" uuid,
	"requires_completion" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"timestamp_seconds" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_user_lesson_uniq" UNIQUE("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"passed" boolean NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"text" text NOT NULL,
	"order" integer NOT NULL,
	"options" jsonb NOT NULL,
	"correct_option_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"passing_score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quizzes_lesson_id_unique" UNIQUE("lesson_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plataforma"."series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "series_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."certificates" ADD CONSTRAINT "certificates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "plataforma"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."certificates" ADD CONSTRAINT "certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."courses" ADD CONSTRAINT "courses_instructor_id_instructors_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "plataforma"."instructors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."courses" ADD CONSTRAINT "courses_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "plataforma"."series"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."discussion_posts" ADD CONSTRAINT "discussion_posts_discussion_id_discussions_id_fk" FOREIGN KEY ("discussion_id") REFERENCES "plataforma"."discussions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."discussion_posts" ADD CONSTRAINT "discussion_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."discussion_posts" ADD CONSTRAINT "discussion_posts_parent_post_id_discussion_posts_id_fk" FOREIGN KEY ("parent_post_id") REFERENCES "plataforma"."discussion_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."discussions" ADD CONSTRAINT "discussions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "plataforma"."lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."discussions" ADD CONSTRAINT "discussions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "plataforma"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "plataforma"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."instructors" ADD CONSTRAINT "instructors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."lessons" ADD CONSTRAINT "lessons_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "plataforma"."modules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."lessons" ADD CONSTRAINT "lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "plataforma"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."lessons" ADD CONSTRAINT "lessons_next_lesson_id_lessons_id_fk" FOREIGN KEY ("next_lesson_id") REFERENCES "plataforma"."lessons"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."modules" ADD CONSTRAINT "modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "plataforma"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."notes" ADD CONSTRAINT "notes_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "plataforma"."lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."progress" ADD CONSTRAINT "progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."progress" ADD CONSTRAINT "progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "plataforma"."lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."progress" ADD CONSTRAINT "progress_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "plataforma"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "plataforma"."quizzes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "plataforma"."quizzes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plataforma"."quizzes" ADD CONSTRAINT "quizzes_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "plataforma"."lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "certificates_course_id_idx" ON "plataforma"."certificates" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "certificates_user_id_idx" ON "plataforma"."certificates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_slug_idx" ON "plataforma"."courses" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_instructor_id_idx" ON "plataforma"."courses" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_series_id_idx" ON "plataforma"."courses" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_category_idx" ON "plataforma"."courses" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_published_idx" ON "plataforma"."courses" USING btree ("published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discussion_posts_discussion_id_idx" ON "plataforma"."discussion_posts" USING btree ("discussion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discussion_posts_author_id_idx" ON "plataforma"."discussion_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discussion_posts_parent_post_id_idx" ON "plataforma"."discussion_posts" USING btree ("parent_post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discussions_course_id_idx" ON "plataforma"."discussions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollments_user_id_idx" ON "plataforma"."enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollments_course_id_idx" ON "plataforma"."enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instructors_user_id_idx" ON "plataforma"."instructors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lessons_module_id_idx" ON "plataforma"."lessons" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lessons_course_id_idx" ON "plataforma"."lessons" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "modules_course_id_idx" ON "plataforma"."modules" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notes_user_id_idx" ON "plataforma"."notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notes_lesson_id_idx" ON "plataforma"."notes" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "progress_user_id_idx" ON "plataforma"."progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "progress_course_id_idx" ON "plataforma"."progress" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_attempts_quiz_id_idx" ON "plataforma"."quiz_attempts" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_attempts_user_id_idx" ON "plataforma"."quiz_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_questions_quiz_id_idx" ON "plataforma"."quiz_questions" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_slug_idx" ON "plataforma"."series" USING btree ("slug");
