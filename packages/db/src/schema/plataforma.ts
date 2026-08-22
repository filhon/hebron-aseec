import {
  boolean,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { plataformaSchema, users } from "./public";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const lessonTypeEnum = plataformaSchema.enum("lesson_type", [
  "video",
  "text",
  "quiz",
  "download",
]);

// ---------------------------------------------------------------------------
// plataforma.instructors
// ---------------------------------------------------------------------------
export const instructors = plataformaSchema.table(
  "instructors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("instructors_user_id_idx").on(table.userId)],
);

// ---------------------------------------------------------------------------
// plataforma.series — coleção temática de cursos (PATCH-024)
// ---------------------------------------------------------------------------
export const series = plataformaSchema.table(
  "series",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("series_slug_idx").on(table.slug)],
);

// ---------------------------------------------------------------------------
// plataforma.courses — acesso liberado a qualquer usuário registrado,
// sem restrição por papel (BRAIN §6.3).
// ---------------------------------------------------------------------------
export const courses = plataformaSchema.table(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    coverUrl: text("cover_url"),
    category: text("category").notNull(),
    instructorId: uuid("instructor_id")
      .notNull()
      .references(() => instructors.id),
    // Coleção temática à qual o curso pertence (PATCH-024). Opcional.
    seriesId: uuid("series_id").references(() => series.id, {
      onDelete: "set null",
    }),
    published: boolean("published").notNull().default(false),
    // Arquivamento em vez de exclusão física (P-6.4b) — some do catálogo/
    // editor (filtros em queries.ts + RLS courses_select_published), mas
    // matrícula/progresso/certificado de quem já cursou permanecem intactos.
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("courses_slug_idx").on(table.slug),
    index("courses_instructor_id_idx").on(table.instructorId),
    index("courses_series_id_idx").on(table.seriesId),
    index("courses_category_idx").on(table.category),
    index("courses_published_idx").on(table.published),
    index("courses_archived_at_idx").on(table.archivedAt),
  ],
);

// ---------------------------------------------------------------------------
// plataforma.modules
// ---------------------------------------------------------------------------
export const modules = plataformaSchema.table(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    order: integer("order").notNull(),
    // Arquivamento em vez de exclusão física (P-6.4b) — mesma semântica de
    // courses.archivedAt.
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("modules_course_id_idx").on(table.courseId),
    index("modules_archived_at_idx").on(table.archivedAt),
  ],
);

// ---------------------------------------------------------------------------
// plataforma.lessons — trilha sequencial: requiresCompletion indica se esta
// aula só desbloqueia após a conclusão da aula anterior (BRAIN §6.3); "aula
// anterior"/"próxima aula" são derivadas de (module."order", lesson."order")
// em `plataforma.course_outline()` (0080_plataforma_course_outline.sql,
// P-6.2b) — nunca uma coluna, para não duplicar a trilha que
// `plataforma.can_access_lesson` já ordena. Campos de conteúdo variam por
// type; os não aplicáveis ao tipo ficam null.
// ---------------------------------------------------------------------------
export const lessons = plataformaSchema.table(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: lessonTypeEnum("type").notNull(),
    order: integer("order").notNull(),
    // videoId: vídeo hospedado na library Bunny Stream (P-6.20), reproduzido
    // via URL assinada por matrícula (getLessonVideoPlaybackUrl). videoUrl
    // permanece como fallback de aulas antigas coladas à mão antes do
    // upload real existir — migração de dados fora do escopo, decisão
    // registrada em SESSIONS.md.
    videoId: text("video_id"),
    videoUrl: text("video_url"),
    videoDurationSeconds: integer("video_duration_seconds"),
    content: text("content"),
    downloadUrl: text("download_url"),
    downloadFileName: text("download_file_name"),
    downloadFileSizeBytes: integer("download_file_size_bytes"),
    requiresCompletion: boolean("requires_completion").notNull().default(true),
    // Arquivamento em vez de exclusão física (P-6.4b) — mesma semântica de
    // courses.archivedAt.
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("lessons_module_id_idx").on(table.moduleId),
    index("lessons_course_id_idx").on(table.courseId),
    index("lessons_archived_at_idx").on(table.archivedAt),
  ],
);

// ---------------------------------------------------------------------------
// plataforma.enrollments
// ---------------------------------------------------------------------------
export const enrollments = plataformaSchema.table(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Trilha 100% concluída (todas as aulas do curso com Progress.completedAt)
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("enrollments_user_id_idx").on(table.userId),
    index("enrollments_course_id_idx").on(table.courseId),
    unique("enrollments_user_course_uniq").on(table.userId, table.courseId),
  ],
);

// ---------------------------------------------------------------------------
// plataforma.progress — granular por aula (BRAIN §6.3).
// ---------------------------------------------------------------------------
export const progress = plataformaSchema.table(
  "progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("progress_user_id_idx").on(table.userId),
    index("progress_course_id_idx").on(table.courseId),
    unique("progress_user_lesson_uniq").on(table.userId, table.lessonId),
  ],
);

// ---------------------------------------------------------------------------
// plataforma.quizzes — semântica PATCH-010: a aula-quiz conclui quando
// attempt.score >= passingScore; tentativas ilimitadas. PATCH-023: restrito
// a múltipla escolha (sem dissertativa).
// ---------------------------------------------------------------------------
export const quizzes = plataformaSchema.table("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id")
    .notNull()
    .unique()
    .references(() => lessons.id, { onDelete: "cascade" }),
  passingScore: integer("passing_score").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// plataforma.quiz_questions — múltipla escolha apenas (PATCH-023); options
// guardadas em jsonb, correctOptionId referencia o id de uma opção do array.
// ---------------------------------------------------------------------------
export const quizQuestions = plataformaSchema.table(
  "quiz_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    order: integer("order").notNull(),
    options: jsonb("options").$type<{ id: string; text: string }[]>().notNull(),
    correctOptionId: text("correct_option_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("quiz_questions_quiz_id_idx").on(table.quizId)],
);

// ---------------------------------------------------------------------------
// plataforma.quiz_attempts
// ---------------------------------------------------------------------------
export const quizAttempts = plataformaSchema.table(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    answers: jsonb("answers")
      .$type<{ questionId: string; optionId: string }[]>()
      .notNull(),
    score: integer("score").notNull(),
    // score >= passingScore do quiz no momento da tentativa
    passed: boolean("passed").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("quiz_attempts_quiz_id_idx").on(table.quizId),
    index("quiz_attempts_user_id_idx").on(table.userId),
  ],
);

// ---------------------------------------------------------------------------
// plataforma.certificates — certificação v1: automática, concluir trilha =
// certificado (BRAIN §6.3). verification_hash: anti-fraude barato para rota
// pública de verificação (PATCH-010). Um certificado por curso concluído
// por usuário (emissão automática — nunca duplicada).
// ---------------------------------------------------------------------------
export const certificates = plataformaSchema.table(
  "certificates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    verificationHash: text("verification_hash").notNull().unique(),
  },
  (table) => [
    index("certificates_course_id_idx").on(table.courseId),
    index("certificates_user_id_idx").on(table.userId),
    unique("certificates_course_user_uniq").on(table.courseId, table.userId),
  ],
);

// ---------------------------------------------------------------------------
// plataforma.discussions — fórum por aula (BRAIN §6.3), um por aula.
// ---------------------------------------------------------------------------
export const discussions = plataformaSchema.table(
  "discussions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .notNull()
      .unique()
      .references(() => lessons.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("discussions_course_id_idx").on(table.courseId)],
);

// ---------------------------------------------------------------------------
// plataforma.discussion_posts
// ---------------------------------------------------------------------------
export const discussionPosts = plataformaSchema.table(
  "discussion_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    discussionId: uuid("discussion_id")
      .notNull()
      .references(() => discussions.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    // Não nulo quando é resposta a outro post
    parentPostId: uuid("parent_post_id").references(
      (): AnyPgColumn => discussionPosts.id,
      { onDelete: "cascade" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("discussion_posts_discussion_id_idx").on(table.discussionId),
    index("discussion_posts_author_id_idx").on(table.authorId),
    index("discussion_posts_parent_post_id_idx").on(table.parentPostId),
  ],
);

// ---------------------------------------------------------------------------
// plataforma.notes — nota pessoal ancorada a um timestamp da aula.
// ---------------------------------------------------------------------------
export const notes = plataformaSchema.table(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    timestampSeconds: integer("timestamp_seconds").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notes_user_id_idx").on(table.userId),
    index("notes_lesson_id_idx").on(table.lessonId),
  ],
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type Instructor = typeof instructors.$inferSelect;
export type NewInstructor = typeof instructors.$inferInsert;
export type Series = typeof series.$inferSelect;
export type NewSeries = typeof series.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type CourseModule = typeof modules.$inferSelect;
export type NewCourseModule = typeof modules.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;
export type Progress = typeof progress.$inferSelect;
export type NewProgress = typeof progress.$inferInsert;
export type Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type NewQuizQuestion = typeof quizQuestions.$inferInsert;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type NewQuizAttempt = typeof quizAttempts.$inferInsert;
export type Certificate = typeof certificates.$inferSelect;
export type NewCertificate = typeof certificates.$inferInsert;
export type Discussion = typeof discussions.$inferSelect;
export type NewDiscussion = typeof discussions.$inferInsert;
export type DiscussionPost = typeof discussionPosts.$inferSelect;
export type NewDiscussionPost = typeof discussionPosts.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
