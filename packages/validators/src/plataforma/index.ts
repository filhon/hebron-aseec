import { z } from "zod";

// ─── Shared enums ─────────────────────────────────────────────────────────────

const lessonTypeEnum = z.enum(["video", "text", "quiz", "download"]);

// ─── createInstructorSchema ───────────────────────────────────────────────────

export const createInstructorSchema = z.object({
  userId: z.string().uuid().nullable().optional().default(null),
  name: z.string().min(2, "Nome é obrigatório").max(200),
  avatarUrl: z.string().url().nullable().optional().default(null),
  bio: z.string().max(2000).nullable().optional().default(null),
});

export type CreateInstructorInput = z.infer<typeof createInstructorSchema>;

// ─── seriesSchema ─────────────────────────────────────────────────────────────
// Série é coleção temática de cursos, terceiro eixo de busca/filtro do
// catálogo (BRAIN §6.3, PATCH-024).

export const seriesSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório").max(200),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug deve conter apenas letras minúsculas, números e hífen",
    ),
  description: z.string().max(2000).nullable().optional().default(null),
});

export type SeriesInput = z.infer<typeof seriesSchema>;

// ─── createCourseSchema ───────────────────────────────────────────────────────

export const createCourseSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres").max(200),
  slug: z
    .string()
    .min(3)
    .max(200)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug deve conter apenas letras minúsculas, números e hífen",
    ),
  description: z.string().min(10, "Descrição é obrigatória").max(5000),
  // Storage path do bucket privado `plataforma-capas` (não uma URL) —
  // resolvido para uma signed URL sob demanda em lib/queries.ts, nunca
  // persistido como URL (S-05).
  coverImageUrl: z.string().min(1).nullable().optional().default(null),
  category: z.string().min(2, "Categoria é obrigatória").max(100),
  instructorId: z.string().uuid("Selecione um instrutor"),
  seriesId: z.string().uuid().nullable().optional().default(null),
  isPublished: z.boolean().optional().default(false),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

// ─── updateCourseSchema ───────────────────────────────────────────────────────

export const updateCourseSchema = createCourseSchema.extend({
  courseId: z.string().uuid(),
});

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

// ─── createCourseModuleSchema ─────────────────────────────────────────────────

export const createCourseModuleSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(2, "Título é obrigatório").max(200),
  description: z.string().max(2000).nullable().optional().default(null),
  order: z.number().int().min(0),
});

export type CreateCourseModuleInput = z.infer<typeof createCourseModuleSchema>;

// ─── createLessonSchema ───────────────────────────────────────────────────────
// Campos exigidos variam por type (BRAIN §6.3): video exige videoUrl, text exige
// textContent, download exige downloadUrl + downloadFileName.

export const createLessonSchema = z
  .object({
    moduleId: z.string().uuid(),
    courseId: z.string().uuid(),
    title: z.string().min(2, "Título é obrigatório").max(200),
    type: lessonTypeEnum,
    order: z.number().int().min(0),
    // guid do vídeo na Bunny Stream (P-6.20) — preenchido pelo upload em
    // LessonVideoUpload. videoUrl segue como fallback de aulas antigas
    // coladas à mão (aceito só quando não há videoId).
    videoId: z.string().min(1).nullable().optional().default(null),
    videoUrl: z.string().url().nullable().optional().default(null),
    videoDurationSeconds: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional()
      .default(null),
    textContent: z.string().nullable().optional().default(null),
    // Storage path do bucket privado `plataforma-anexos` (não uma URL) —
    // resolvido para uma signed URL sob demanda em lib/queries.ts, nunca
    // persistido como URL (S-05).
    downloadUrl: z.string().min(1).nullable().optional().default(null),
    downloadFileName: z.string().max(255).nullable().optional().default(null),
    downloadFileSizeBytes: z
      .number()
      .int()
      .positive()
      .nullable()
      .optional()
      .default(null),
    requiresCompletion: z.boolean().optional().default(true),
  })
  .refine(
    (lesson) =>
      lesson.type !== "video" ||
      lesson.videoId !== null ||
      lesson.videoUrl !== null,
    {
      message: "Envie o vídeo da aula",
      path: ["videoId"],
    },
  )
  .refine((lesson) => lesson.type !== "text" || lesson.textContent !== null, {
    message: "Informe o conteúdo do texto",
    path: ["textContent"],
  })
  .refine(
    (lesson) =>
      lesson.type !== "download" ||
      (lesson.downloadUrl !== null && lesson.downloadFileName !== null),
    {
      message: "Informe o arquivo para download",
      path: ["downloadUrl"],
    },
  );

export type CreateLessonInput = z.infer<typeof createLessonSchema>;

// ─── enrollInCourseSchema ──────────────────────────────────────────────────────

export const enrollInCourseSchema = z.object({
  courseId: z.string().uuid(),
});

export type EnrollInCourseInput = z.infer<typeof enrollInCourseSchema>;

// ─── markLessonCompleteSchema ─────────────────────────────────────────────────

export const markLessonCompleteSchema = z.object({
  lessonId: z.string().uuid(),
});

export type MarkLessonCompleteInput = z.infer<typeof markLessonCompleteSchema>;

// ─── createQuizSchema ─────────────────────────────────────────────────────────

const quizOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1, "Texto da alternativa é obrigatório").max(500),
});

const quizQuestionSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(3, "Texto da pergunta é obrigatório").max(1000),
    options: z
      .array(quizOptionSchema)
      .min(2, "Adicione pelo menos duas alternativas"),
    correctOptionId: z.string().min(1),
  })
  .refine(
    (question) =>
      question.options.some((option) => option.id === question.correctOptionId),
    {
      message: "A alternativa correta deve estar entre as opções",
      path: ["correctOptionId"],
    },
  );

export const createQuizSchema = z.object({
  lessonId: z.string().uuid(),
  questions: z
    .array(quizQuestionSchema)
    .min(1, "Adicione pelo menos uma pergunta"),
  passingScore: z.number().int().min(0).max(100),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;

// ─── submitQuizAttemptSchema ──────────────────────────────────────────────────

const quizAnswerSchema = z.object({
  questionId: z.string().min(1),
  optionId: z.string().min(1),
});

export const submitQuizAttemptSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.array(quizAnswerSchema).min(1, "Responda pelo menos uma pergunta"),
});

export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>;

// ─── createDiscussionPostSchema ───────────────────────────────────────────────

export const createDiscussionPostSchema = z.object({
  lessonId: z.string().uuid(),
  content: z
    .string()
    .min(1, "Comentário não pode ser vazio")
    .max(3000, "Comentário deve ter no máximo 3000 caracteres"),
  parentPostId: z.string().uuid().nullable().optional().default(null),
});

export type CreateDiscussionPostInput = z.infer<
  typeof createDiscussionPostSchema
>;

// ─── Re-export enums for shared use ───────────────────────────────────────────

export { lessonTypeEnum };
