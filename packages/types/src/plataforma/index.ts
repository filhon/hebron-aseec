// ─── LessonType ───────────────────────────────────────────────────────────────

export type LessonType = "video" | "text" | "quiz" | "download";

// ─── Instructor ───────────────────────────────────────────────────────────────
// Criação de curso é do super_admin hoje; userId liga o instrutor a um usuário
// do sistema quando aplicável — estrutura pronta para o papel `professor`
// futuro (BRAIN §6.3).

export interface Instructor {
  id: string;
  userId: string | null;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Course ───────────────────────────────────────────────────────────────────
// Acesso liberado a qualquer usuário registrado, sem restrição por papel
// (BRAIN §6.3).

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  category: string;
  instructorId: string;
  instructorName: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── CourseModule ─────────────────────────────────────────────────────────────

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Lesson ───────────────────────────────────────────────────────────────────
// Trilha sequencial: nextLessonId aponta a próxima aula do curso; requiresCompletion
// indica se esta aula só desbloqueia após a conclusão da aula anterior (BRAIN §6.3).
// Campos de conteúdo variam por type; os não aplicáveis ao tipo ficam null.

export interface Lesson {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  type: LessonType;
  order: number;
  videoUrl: string | null;
  videoDurationSeconds: number | null;
  textContent: string | null;
  downloadUrl: string | null;
  downloadFileName: string | null;
  downloadFileSizeBytes: number | null;
  /** Preenchido quando type = "quiz" */
  quizId: string | null;
  nextLessonId: string | null;
  requiresCompletion: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Enrollment ───────────────────────────────────────────────────────────────

export interface Enrollment {
  id: string;
  userId: string;
  userName: string;
  courseId: string;
  courseName: string;
  enrolledAt: Date;
  /** Trilha 100% concluída (todas as aulas do curso com Progress.completedAt) */
  completedAt: Date | null;
}

// ─── Progress ─────────────────────────────────────────────────────────────────
// Granular por aula (BRAIN §6.3).

export interface Progress {
  id: string;
  userId: string;
  lessonId: string;
  courseId: string;
  completedAt: Date | null;
  createdAt: Date;
}

// ─── QuizQuestion ─────────────────────────────────────────────────────────────
// Formato das perguntas persistido em jsonb (Quiz.questions).

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  correctOptionId: string;
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────
// Semântica PATCH-010: a aula-quiz conclui quando attempt.score >= passingScore;
// tentativas ilimitadas. A regra de certificação (BRAIN §6.3) não muda — aulas de
// quiz contam como qualquer outra aula concluída na trilha.

export interface Quiz {
  id: string;
  lessonId: string;
  questions: QuizQuestion[];
  /** 0-100 */
  passingScore: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── QuizAttempt ──────────────────────────────────────────────────────────────

export interface QuizAnswer {
  questionId: string;
  optionId: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: QuizAnswer[];
  /** 0-100 */
  score: number;
  /** score >= passingScore do quiz no momento da tentativa */
  passed: boolean;
  attemptedAt: Date;
}

// ─── Certificate ──────────────────────────────────────────────────────────────
// Certificação v1: automática, concluir trilha = certificado (BRAIN §6.3).
// hash: anti-fraude barato para rota pública de verificação (PATCH-010).

export interface Certificate {
  id: string;
  courseId: string;
  courseName: string;
  userId: string;
  userName: string;
  issuedAt: Date;
  hash: string;
}

// ─── Discussion ───────────────────────────────────────────────────────────────
// Fórum por aula (BRAIN §6.3).

export interface Discussion {
  id: string;
  lessonId: string;
  courseId: string;
  createdAt: Date;
}

// ─── DiscussionPost ───────────────────────────────────────────────────────────

export interface DiscussionPost {
  id: string;
  discussionId: string;
  authorId: string;
  authorName: string;
  content: string;
  /** Não nulo quando é resposta a outro post */
  parentPostId: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}
