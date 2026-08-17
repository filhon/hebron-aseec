import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import {
  createSupabaseServerActionClient,
  resolveSession,
} from "@hebron/auth/server";
import type { ActionSession } from "@hebron/auth/server";
import {
  certificates,
  courses,
  discussionPosts,
  discussions,
  enrollments,
  instructors,
  lessons,
  modules,
  notes,
  progress,
  quizAttempts,
  quizQuestions,
  quizzes,
  series,
  users,
} from "@hebron/db/schema";
import type {
  Certificate,
  Course,
  CourseModule,
  DiscussionPost,
  Enrollment,
  Instructor,
  Lesson,
  Progress,
  Quiz,
  QuizAttempt,
  Series,
} from "@hebron/types/plataforma";
import type { LessonNote } from "../components/note-widget";

type CourseRow = typeof courses.$inferSelect;
type LessonRow = typeof lessons.$inferSelect;

// ---------------------------------------------------------------------------
// Sessão — "instrutor" não é papel em public.role, é dado (linha em
// plataforma.instructors vinculada ao próprio user_id), mesma checagem de
// lib/safe-action.ts#staffAction. lib/session.ts não está na lista de
// arquivos permitidos de P-6.9, então os gates ficam aqui (mesmo precedente
// de apps/tarefas/src/lib/queries.ts).
// ---------------------------------------------------------------------------

export async function getAuthUser(): Promise<{
  fullName: string | null;
  email: string | null;
} | null> {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerActionClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      } catch {
        // Server Component — não pode setar cookies, ignorar
      }
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Leitura própria (users_select_own, 0000_initial.sql) — sem exceção
  // service-level, o próprio auth.uid() já é user.id.
  const rows = await withAuthenticatedContext({ actorId: user.id }, (tx) =>
    tx
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1),
  );

  return {
    fullName: rows[0]?.fullName ?? null,
    email: user.email ?? null,
  };
}

/** Acesso liberado a qualquer usuário autenticado, sem restrição de papel
 * (BRAIN §6.3: "acesso a todos os cursos para qualquer usuário registrado"). */
export async function requireAlunoSession(): Promise<ActionSession> {
  const cookieStore = await cookies();
  try {
    return await resolveSession(cookieStore);
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }
}

async function isInstructor(userId: string): Promise<boolean> {
  const [row] = await withAuthenticatedContext({ actorId: userId }, (tx) =>
    tx
      .select({ id: instructors.id })
      .from(instructors)
      .where(eq(instructors.userId, userId))
      .limit(1),
  );
  return !!row;
}

/** super_admin OU instrutor (dado) — mesma checagem de
 * lib/safe-action.ts#staffAction. Qualquer instrutor gerencia qualquer
 * curso, sem escopo por curso (mesma suposição G1 de P-6.7/P-6.8). */
export async function requireInstrutorSession(): Promise<ActionSession> {
  const cookieStore = await cookies();
  let session: ActionSession;
  try {
    session = await resolveSession(cookieStore);
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }

  if (
    !session.roles.includes("super_admin") &&
    !(await isInstructor(session.actorId))
  ) {
    redirect(CANONICAL_LOGIN_URL);
  }

  return session;
}

/** super_admin exclusivamente — gestão do cadastro de instrutores (RLS
 * `instructors_mutate_admin`, 0020_plataforma_rls.sql). Diferente de
 * requireInstrutorSession: instrutor (dado, sem papel em public.role) não
 * deve acessar esta tela — só quem administra o cadastro global. */
export async function requireSuperAdminSession(): Promise<ActionSession> {
  const cookieStore = await cookies();
  let session: ActionSession;
  try {
    session = await resolveSession(cookieStore);
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }

  if (!session.roles.includes("super_admin")) {
    redirect(CANONICAL_LOGIN_URL);
  }

  return session;
}

// ---------------------------------------------------------------------------
// Mapeamento DB → forma "rica" de @hebron/types/plataforma (já consumida
// pelos componentes do Bloco A). Mesma ideia de assembleTasks em
// apps/tarefas/src/lib/queries.ts.
// ---------------------------------------------------------------------------

function mapCourse(
  row: CourseRow,
  instructorName: string | null,
  seriesName: string | null,
): Course {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    coverImageUrl: row.coverUrl,
    category: row.category,
    instructorId: row.instructorId,
    instructorName: instructorName ?? "",
    seriesId: row.seriesId,
    seriesName: seriesName ?? null,
    isPublished: row.published,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapLesson(
  row: LessonRow,
  quizId: string | null = null,
  trail?: { nextLessonId: string | null; unlocked: boolean },
): Lesson {
  return {
    id: row.id,
    moduleId: row.moduleId,
    courseId: row.courseId,
    title: row.title,
    type: row.type,
    order: row.order,
    videoUrl: row.videoUrl,
    videoDurationSeconds: row.videoDurationSeconds,
    textContent: row.content,
    downloadUrl: row.downloadUrl,
    downloadFileName: row.downloadFileName,
    downloadFileSizeBytes: row.downloadFileSizeBytes,
    quizId,
    nextLessonId: trail?.nextLessonId ?? null,
    requiresCompletion: row.requiresCompletion,
    // Editor de instrutor não passa `trail` — a trilha do aluno não se
    // aplica lá, então o padrão é "sempre desbloqueada" (P-6.2b).
    unlocked: trail?.unlocked ?? true,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Esqueleto da trilha — plataforma.course_outline() (SECURITY DEFINER,
// 0080_plataforma_course_outline.sql, P-6.2b) devolve toda aula de um curso
// publicado (matriculado ou não), com `unlocked` calculado por
// plataforma.can_access_lesson. Nunca carrega conteúdo (video_url/content/
// download_url): esses campos continuam atrás de lessons_select_enrolled,
// mesclados abaixo só quando o SELECT direto em `lessons` (sob RLS) de fato
// devolve a linha. "Próxima aula" é derivada da mesma ordem que a função usa
// — uma fonte só, nunca mais a coluna `next_lesson_id` (removida nesta
// migration).
// ---------------------------------------------------------------------------

interface CourseOutlineRow {
  lesson_id: string;
  module_id: string;
  module_order: number;
  lesson_order: number;
  title: string;
  type: LessonRow["type"];
  video_duration_seconds: number | null;
  requires_completion: boolean;
  unlocked: boolean;
  [key: string]: unknown;
}

async function getCourseOutline(
  tx: Parameters<Parameters<typeof withAuthenticatedContext>[1]>[0],
  courseId: string,
): Promise<CourseOutlineRow[]> {
  return tx.execute<CourseOutlineRow>(
    sql`SELECT * FROM plataforma.course_outline(${courseId}::uuid)`,
  );
}

function computeNextLessonIds(
  outlineRows: CourseOutlineRow[],
): Map<string, string> {
  const sorted = [...outlineRows].sort(
    (a, b) =>
      a.module_order - b.module_order || a.lesson_order - b.lesson_order,
  );
  const nextByLessonId = new Map<string, string>();
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (current && next) nextByLessonId.set(current.lesson_id, next.lesson_id);
  }
  return nextByLessonId;
}

/** Monta a `Lesson` de um item da ementa: conteúdo real quando `contentRow`
 * veio do SELECT gated por RLS (aula liberada e matriculado), campos de
 * conteúdo nulos caso contrário — nunca expõe video_url/content/download_url
 * de uma aula que a RLS não devolveu (P-6.2b, item 1 do prompt). */
function mapOutlineLesson(
  outlineRow: CourseOutlineRow,
  courseId: string,
  contentRow: LessonRow | undefined,
  nextLessonId: string | null,
  quizId: string | null = null,
): Lesson {
  if (contentRow) {
    return mapLesson(contentRow, quizId, {
      nextLessonId,
      unlocked: outlineRow.unlocked,
    });
  }

  return {
    id: outlineRow.lesson_id,
    moduleId: outlineRow.module_id,
    courseId,
    title: outlineRow.title,
    type: outlineRow.type,
    order: outlineRow.lesson_order,
    videoUrl: null,
    videoDurationSeconds: outlineRow.video_duration_seconds,
    textContent: null,
    downloadUrl: null,
    downloadFileName: null,
    downloadFileSizeBytes: null,
    quizId: null,
    nextLessonId,
    requiresCompletion: outlineRow.requires_completion,
    unlocked: outlineRow.unlocked,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

// ---------------------------------------------------------------------------
// Resolução sob demanda de capa/anexo (S-05) — `courses.cover_url`/
// `lessons.download_url` guardam o storage path (não mais uma signed URL de
// 10 anos), assinado aqui com TTL curto no exato momento em que a tela que
// efetivamente exibe a imagem/anexo é montada — nunca persistido. Usado só
// onde a capa/anexo é de fato renderizado como <img>/<a> (CourseCard via
// getUserEnrollmentsWithProgress; download da aula via getLessonPageData) —
// course-detail-view.tsx não tem banner de capa, e as leituras do editor
// (getCourseForEditor, getLessonForEditor, buildQuizEditorData) mantêm o path
// cru: CourseForm/LessonForm reenviam esse mesmo valor ao salvar sem alterar
// a capa/anexo, e persistir uma URL assinada ali reproduziria o bug original.
// Linhas gravadas antes desta correção ainda guardam a URL legada de 10 anos;
// `createSignedUrl` falha para um valor que não é um path do bucket e
// degrada para null (sem capa/anexo) até o instrutor reenviar o arquivo.
const ASSET_URL_EXPIRES_IN_SECONDS = 60 * 60;

async function resolveAssetUrl(
  bucket: "plataforma-capas" | "plataforma-anexos",
  storagePath: string | null,
): Promise<string | null> {
  if (!storagePath) return null;

  const cookieStore = await cookies();
  const supabase = createSupabaseServerActionClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      } catch {
        // Server Component — não pode setar cookies, ignorar
      }
    },
  });

  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, ASSET_URL_EXPIRES_IN_SECONDS);
  return data?.signedUrl ?? null;
}

// ---------------------------------------------------------------------------
// Instrutores / séries / categorias — usados pelo formulário de criação de
// curso (instrutor/curso/novo).
// ---------------------------------------------------------------------------

export async function getInstructors(actorId: string): Promise<Instructor[]> {
  return withAuthenticatedContext({ actorId }, (tx) =>
    tx.select().from(instructors).orderBy(asc(instructors.name)),
  );
}

// ---------------------------------------------------------------------------
// Gestão de instrutores (equipe) — super_admin (P-6.13, gap S-113).
// ---------------------------------------------------------------------------

export interface InstructorWithStats extends Instructor {
  courseCount: number;
}

export async function getInstructorsWithStats(
  actorId: string,
): Promise<InstructorWithStats[]> {
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const instructorRows = await tx
      .select()
      .from(instructors)
      .orderBy(asc(instructors.name));

    const courseCountRows = await tx
      .select({
        instructorId: courses.instructorId,
        count: sql<number>`count(*)::int`,
      })
      .from(courses)
      .groupBy(courses.instructorId);
    const courseCountByInstructor = new Map(
      courseCountRows.map((r) => [r.instructorId, r.count]),
    );

    return instructorRows.map((row) => ({
      ...row,
      courseCount: courseCountByInstructor.get(row.id) ?? 0,
    }));
  });
}

export interface SelectableUser {
  id: string;
  fullName: string | null;
  email: string;
}

/** Lista de usuários para vincular a um instrutor (P-6.13). Sem filtro por
 * usuário já vinculado — um mesmo usuário pode ter mais de uma linha em
 * plataforma.instructors (ex.: reaproveitar conta de teste), suposição
 * simples registrada em SESSIONS.md por não haver regra em BRAIN.md/RLS. */
export async function getUsersForInstructorLink(
  actorId: string,
): Promise<SelectableUser[]> {
  return withAuthenticatedContext({ actorId }, (tx) =>
    tx
      .select({ id: users.id, fullName: users.fullName, email: users.email })
      .from(users)
      .orderBy(asc(users.fullName)),
  );
}

export async function getSeriesList(actorId: string): Promise<Series[]> {
  return withAuthenticatedContext({ actorId }, (tx) =>
    tx.select().from(series).orderBy(asc(series.name)),
  );
}

export async function getCourseCategories(actorId: string): Promise<string[]> {
  const rows = await withAuthenticatedContext({ actorId }, (tx) =>
    tx.selectDistinct({ category: courses.category }).from(courses),
  );
  return rows
    .map((r) => r.category)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// ---------------------------------------------------------------------------
// Curso (aluno) — página de detalhe.
// ---------------------------------------------------------------------------

export interface CourseDetail {
  course: Course;
  instructorBio: string | null;
}

export async function getCourseBySlug(
  actorId: string,
  slug: string,
): Promise<CourseDetail | null> {
  const rows = await withAuthenticatedContext({ actorId }, (tx) =>
    tx
      .select({
        course: courses,
        instructorName: instructors.name,
        instructorBio: instructors.bio,
        seriesName: series.name,
      })
      .from(courses)
      .leftJoin(instructors, eq(instructors.id, courses.instructorId))
      .leftJoin(series, eq(series.id, courses.seriesId))
      .where(and(eq(courses.slug, slug), isNull(courses.archivedAt)))
      .limit(1),
  );
  const row = rows[0];
  if (!row) return null;

  // course-detail-view.tsx não renderiza coverImageUrl (sem banner de capa na
  // página de detalhe) — sem resolver aqui; único ponto real de consumo do
  // storage path é CourseCard (getUserEnrollmentsWithProgress) e o anexo de
  // aula (getLessonPageData).
  return {
    course: mapCourse(row.course, row.instructorName, row.seriesName),
    instructorBio: row.instructorBio ?? null,
  };
}

export async function getCourseModulesWithLessons(
  actorId: string,
  courseId: string,
): Promise<{ modules: CourseModule[]; lessons: Lesson[] }> {
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const moduleRows = await tx
      .select()
      .from(modules)
      .where(and(eq(modules.courseId, courseId), isNull(modules.archivedAt)))
      .orderBy(asc(modules.order));

    // Esqueleto da trilha inteira (matriculado ou não, P-6.2b item 2/6) +
    // conteúdo só das aulas que a RLS de fato libera para este usuário.
    // course_outline() já filtra módulo/aula/curso arquivado
    // (0082_plataforma_arquivamento.sql) — moduleRows acima segue o mesmo
    // filtro para a ementa nunca listar um módulo arquivado sem aulas.
    const outlineRows = await getCourseOutline(tx, courseId);
    const nextLessonIdByLessonId = computeNextLessonIds(outlineRows);
    const contentRows = await tx
      .select()
      .from(lessons)
      .where(eq(lessons.courseId, courseId));
    const contentByLessonId = new Map(contentRows.map((row) => [row.id, row]));

    return {
      modules: moduleRows,
      lessons: outlineRows.map((row) =>
        mapOutlineLesson(
          row,
          courseId,
          contentByLessonId.get(row.lesson_id),
          nextLessonIdByLessonId.get(row.lesson_id) ?? null,
        ),
      ),
    };
  });
}

export async function getEnrollment(
  actorId: string,
  courseId: string,
): Promise<Enrollment | null> {
  const rows = await withAuthenticatedContext({ actorId }, (tx) =>
    tx
      .select({ enrollment: enrollments, courseName: courses.title })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .where(
        and(
          eq(enrollments.userId, actorId),
          eq(enrollments.courseId, courseId),
        ),
      )
      .limit(1),
  );
  const row = rows[0];
  if (!row) return null;

  return {
    id: row.enrollment.id,
    userId: row.enrollment.userId,
    userName: "",
    courseId: row.enrollment.courseId,
    courseName: row.courseName,
    enrolledAt: row.enrollment.enrolledAt,
    completedAt: row.enrollment.completedAt,
  };
}

export async function getUserProgressForCourse(
  actorId: string,
  courseId: string,
): Promise<Progress[]> {
  return withAuthenticatedContext({ actorId }, (tx) =>
    tx
      .select()
      .from(progress)
      .where(
        and(eq(progress.userId, actorId), eq(progress.courseId, courseId)),
      ),
  );
}

// ---------------------------------------------------------------------------
// Aula (aluno) — player, quiz, discussão, notas. Se a aula não retornar
// (RLS plataforma.can_access_lesson barra aula fora da trilha liberada), a
// página trata como "não encontrada/bloqueada" — a regra vive só no banco,
// não duplicada aqui (defense in depth, G6 do CLAUDE.md).
// ---------------------------------------------------------------------------

// isOwnPost/canModerate são computados aqui (P-6.4b) para que
// discussion-thread.tsx saiba, por post, se o autor pode editar/remover e se
// o viewer modera qualquer post — sem precisar de um novo prop de sessão em
// LessonView, já que app/(aluno)/curso/[slug]/aula/[id]/page.tsx não está na
// lista de arquivos permitidos deste prompt para ganhar um novo campo
// (decisão registrada em SESSIONS.md).
export type LessonDiscussionPost = DiscussionPost & {
  isOwnPost: boolean;
  canModerate: boolean;
};

export interface LessonPageData {
  course: Course;
  modules: CourseModule[];
  lessons: Lesson[];
  lesson: Lesson;
  progress: Progress[];
  quiz: Quiz | null;
  lastAttempt: QuizAttempt | null;
  posts: LessonDiscussionPost[];
  notes: LessonNote[];
}

export async function getLessonPageData(
  actorId: string,
  slug: string,
  lessonId: string,
): Promise<LessonPageData | null> {
  const cookieStore = await cookies();
  let isSuperAdmin = false;
  try {
    const session = await resolveSession(cookieStore);
    isSuperAdmin = session.roles.includes("super_admin");
  } catch {
    isSuperAdmin = false;
  }

  return withAuthenticatedContext({ actorId }, async (tx) => {
    const courseRows = await tx
      .select({
        course: courses,
        instructorName: instructors.name,
        seriesName: series.name,
      })
      .from(courses)
      .leftJoin(instructors, eq(instructors.id, courses.instructorId))
      .leftJoin(series, eq(series.id, courses.seriesId))
      .where(eq(courses.slug, slug))
      .limit(1);
    const courseRow = courseRows[0];
    if (!courseRow) return null;
    const course = mapCourse(
      courseRow.course,
      courseRow.instructorName,
      courseRow.seriesName,
    );

    const lessonRows = await tx
      .select()
      .from(lessons)
      .where(and(eq(lessons.id, lessonId), eq(lessons.courseId, course.id)))
      .limit(1);
    const lessonRow = lessonRows[0];
    if (!lessonRow) return null;

    const moduleRows = await tx
      .select()
      .from(modules)
      .where(eq(modules.courseId, course.id))
      .orderBy(asc(modules.order));

    // Esqueleto da trilha inteira, para a sidebar mostrar módulos/aulas
    // travadas (P-6.2b) — a aula corrente já veio pelo SELECT direto acima,
    // barrado pela RLS como antes.
    const outlineRows = await getCourseOutline(tx, course.id);
    const nextLessonIdByLessonId = computeNextLessonIds(outlineRows);
    const allLessonRows = await tx
      .select()
      .from(lessons)
      .where(eq(lessons.courseId, course.id))
      .orderBy(asc(lessons.order));
    const contentByLessonId = new Map(
      allLessonRows.map((row) => [row.id, row]),
    );

    const progressRows = await tx
      .select()
      .from(progress)
      .where(
        and(eq(progress.userId, actorId), eq(progress.courseId, course.id)),
      );

    let quiz: Quiz | null = null;
    let lastAttempt: QuizAttempt | null = null;
    let lessonQuizId: string | null = null;

    if (lessonRow.type === "quiz") {
      const quizRows = await tx
        .select()
        .from(quizzes)
        .where(eq(quizzes.lessonId, lessonRow.id))
        .limit(1);
      const quizRow = quizRows[0];

      if (quizRow) {
        lessonQuizId = quizRow.id;
        const questionRows = await tx
          .select()
          .from(quizQuestions)
          .where(eq(quizQuestions.quizId, quizRow.id))
          .orderBy(asc(quizQuestions.order));

        quiz = {
          id: quizRow.id,
          lessonId: quizRow.lessonId,
          passingScore: quizRow.passingScore,
          questions: questionRows.map((q) => ({
            id: q.id,
            text: q.text,
            options: q.options,
            correctOptionId: q.correctOptionId,
          })),
          createdAt: quizRow.createdAt,
          updatedAt: quizRow.updatedAt,
        };

        const attemptRows = await tx
          .select()
          .from(quizAttempts)
          .where(
            and(
              eq(quizAttempts.quizId, quizRow.id),
              eq(quizAttempts.userId, actorId),
            ),
          )
          .orderBy(desc(quizAttempts.attemptedAt))
          .limit(1);
        const attemptRow = attemptRows[0];
        if (attemptRow) {
          lastAttempt = {
            id: attemptRow.id,
            quizId: attemptRow.quizId,
            userId: attemptRow.userId,
            answers: attemptRow.answers,
            score: attemptRow.score,
            passed: attemptRow.passed,
            attemptedAt: attemptRow.attemptedAt,
          };
        }
      }
    }

    const discussionRows = await tx
      .select()
      .from(discussions)
      .where(eq(discussions.lessonId, lessonRow.id))
      .limit(1);
    const discussionRow = discussionRows[0];

    let posts: LessonDiscussionPost[] = [];
    if (discussionRow) {
      const postRows = await tx
        .select({ post: discussionPosts, authorName: users.fullName })
        .from(discussionPosts)
        .innerJoin(users, eq(users.id, discussionPosts.authorId))
        .where(eq(discussionPosts.discussionId, discussionRow.id))
        .orderBy(asc(discussionPosts.createdAt));

      posts = postRows.map((r) => ({
        id: r.post.id,
        discussionId: r.post.discussionId,
        authorId: r.post.authorId,
        authorName: r.authorName ?? "—",
        content: r.post.content,
        parentPostId: r.post.parentPostId,
        createdAt: r.post.createdAt,
        updatedAt: r.post.updatedAt,
        isOwnPost: r.post.authorId === actorId,
        canModerate: isSuperAdmin,
      }));
    }

    const noteRows = await tx
      .select()
      .from(notes)
      .where(and(eq(notes.userId, actorId), eq(notes.lessonId, lessonRow.id)))
      .orderBy(asc(notes.timestampSeconds));

    // A aula corrente só chegou até aqui porque a RLS já a liberou —
    // sempre desbloqueada e com a próxima aula da trilha derivada da mesma
    // ordem que alimenta o esqueleto abaixo.
    const currentLesson = mapLesson(lessonRow, lessonQuizId, {
      nextLessonId: nextLessonIdByLessonId.get(lessonRow.id) ?? null,
      unlocked: true,
    });
    if (currentLesson.type === "download") {
      currentLesson.downloadUrl = await resolveAssetUrl(
        "plataforma-anexos",
        currentLesson.downloadUrl,
      );
    }

    return {
      course,
      modules: moduleRows,
      lessons: outlineRows.map((row) =>
        mapOutlineLesson(
          row,
          course.id,
          contentByLessonId.get(row.lesson_id),
          nextLessonIdByLessonId.get(row.lesson_id) ?? null,
          row.lesson_id === lessonRow.id ? lessonQuizId : null,
        ),
      ),
      lesson: currentLesson,
      progress: progressRows,
      quiz,
      lastAttempt,
      posts,
      notes: noteRows.map((n) => ({
        id: n.id,
        timestampSeconds: n.timestampSeconds,
        content: n.content,
        createdAt: n.createdAt,
      })),
    };
  });
}

// ---------------------------------------------------------------------------
// Jornada (aluno) — matrículas + progresso por curso.
// ---------------------------------------------------------------------------

export interface EnrollmentWithCourse {
  enrollment: Enrollment;
  course: Course;
  progressPercent: number;
}

export async function getUserEnrollmentsWithProgress(
  actorId: string,
): Promise<EnrollmentWithCourse[]> {
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const rows = await tx
      .select({
        enrollment: enrollments,
        course: courses,
        instructorName: instructors.name,
        seriesName: series.name,
      })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .leftJoin(instructors, eq(instructors.id, courses.instructorId))
      .leftJoin(series, eq(series.id, courses.seriesId))
      .where(eq(enrollments.userId, actorId))
      .orderBy(desc(enrollments.enrolledAt));

    if (rows.length === 0) return [];
    const courseIds = rows.map((r) => r.course.id);

    // Total real da trilha via plataforma.course_outline() (P-6.2b) — um
    // SELECT direto em `lessons` aqui contaria só as aulas que a RLS libera
    // para este aluno, inflando o percentual (mesmo defeito de
    // checkAndIssueCertificate, actions/certificates.ts).
    const totalsByCourse = new Map<string, number>();
    for (const courseId of courseIds) {
      const outlineRows = await getCourseOutline(tx, courseId);
      totalsByCourse.set(courseId, outlineRows.length);
    }

    const completedRows = await tx
      .select({
        courseId: progress.courseId,
        completed: sql<number>`count(*)::int`,
      })
      .from(progress)
      .where(
        and(
          eq(progress.userId, actorId),
          inArray(progress.courseId, courseIds),
          isNotNull(progress.completedAt),
        ),
      )
      .groupBy(progress.courseId);
    const completedByCourse = new Map(
      completedRows.map((r) => [r.courseId, r.completed]),
    );

    return Promise.all(
      rows.map(async (r) => {
        const total = totalsByCourse.get(r.course.id) ?? 0;
        const completed = completedByCourse.get(r.course.id) ?? 0;
        const progressPercent =
          total > 0 ? Math.round((completed / total) * 100) : 0;
        const course = mapCourse(r.course, r.instructorName, r.seriesName);

        return {
          enrollment: {
            id: r.enrollment.id,
            userId: r.enrollment.userId,
            userName: "",
            courseId: r.enrollment.courseId,
            courseName: r.course.title,
            enrolledAt: r.enrollment.enrolledAt,
            completedAt: r.enrollment.completedAt,
          },
          course: {
            ...course,
            coverImageUrl: await resolveAssetUrl(
              "plataforma-capas",
              course.coverImageUrl,
            ),
          },
          progressPercent,
        };
      }),
    );
  });
}

// ---------------------------------------------------------------------------
// Certificados (aluno).
// ---------------------------------------------------------------------------

export async function getUserCertificates(
  actorId: string,
): Promise<Certificate[]> {
  const rows = await withAuthenticatedContext({ actorId }, (tx) =>
    tx
      .select({
        certificate: certificates,
        courseTitle: courses.title,
        userFullName: users.fullName,
      })
      .from(certificates)
      .innerJoin(courses, eq(courses.id, certificates.courseId))
      .innerJoin(users, eq(users.id, certificates.userId))
      .where(eq(certificates.userId, actorId))
      .orderBy(desc(certificates.issuedAt)),
  );

  return rows.map((r) => ({
    id: r.certificate.id,
    courseId: r.certificate.courseId,
    courseName: r.courseTitle,
    userId: r.certificate.userId,
    userName: r.userFullName ?? "Aluno",
    issuedAt: r.certificate.issuedAt,
    hash: r.certificate.verificationHash,
  }));
}

export interface CertificateVerification {
  courseTitle: string;
  userName: string;
  issuedAt: Date;
}

/** Verificação pública de certificado (P-6.14) — sem sessão, papel `anon`.
 * Usa exclusivamente plataforma.verify_certificate (SECURITY DEFINER STABLE,
 * GRANT a anon); nunca SELECT direto em certificates, que não abre RLS para
 * anon (P-6.7, 0020_plataforma_rls.sql). */
export async function getCertificateVerification(
  hash: string,
): Promise<CertificateVerification | null> {
  const rows = await withAuthenticatedContext(null, (tx) =>
    tx.execute<{
      course_title: string;
      user_name: string | null;
      issued_at: string;
    }>(sql`SELECT * FROM plataforma.verify_certificate(${hash})`),
  );
  const row = rows[0];
  if (!row) return null;

  return {
    courseTitle: row.course_title,
    userName: row.user_name ?? "Aluno",
    issuedAt: new Date(row.issued_at),
  };
}

// ---------------------------------------------------------------------------
// Painel do instrutor — todos os cursos (qualquer instrutor gerencia
// qualquer curso, sem escopo por curso — suposição já registrada em
// P-6.7/P-6.8).
// ---------------------------------------------------------------------------

export interface InstructorCourseStats {
  course: Course;
  enrollmentCount: number;
  avgPercent: number;
  certificateCount: number;
}

interface CourseStatsRow {
  course_id: string;
  enrollment_count: number;
  certificate_count: number;
  avg_percent: number;
  [key: string]: unknown;
}

export async function getInstructorDashboardCourses(
  actorId: string,
): Promise<InstructorCourseStats[]> {
  return withAuthenticatedContext({ actorId }, async (tx) => {
    // courses_mutate_staff (RLS) é FOR ALL sem filtro de archived_at —
    // instrutor enxergaria curso arquivado sem este WHERE explícito (mesma
    // razão de já enxergar rascunho aqui, intencional).
    const courseRows = await tx
      .select({
        course: courses,
        instructorName: instructors.name,
        seriesName: series.name,
      })
      .from(courses)
      .leftJoin(instructors, eq(instructors.id, courses.instructorId))
      .leftJoin(series, eq(series.id, courses.seriesId))
      .where(isNull(courses.archivedAt))
      .orderBy(desc(courses.createdAt));

    if (courseRows.length === 0) return [];
    const courseIds = courseRows.map((r) => r.course.id);

    // Agregado (matrículas/certificados/progresso médio) via
    // plataforma.course_stats() (P-6.3c) — um SELECT direto em enrollments/
    // progress/certificates aqui só devolveria as linhas do próprio
    // instrutor (enrollments_select_own/progress_select_own/
    // certificates_select_own, 0020_plataforma_rls.sql), zerando o painel
    // para exatamente o público da tela.
    const courseIdsArray = sql.join(
      courseIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    );
    const statsRows = await tx.execute<CourseStatsRow>(
      sql`SELECT * FROM plataforma.course_stats(ARRAY[${courseIdsArray}])`,
    );
    const statsByCourse = new Map(statsRows.map((r) => [r.course_id, r]));

    return courseRows.map((r) => {
      const stats = statsByCourse.get(r.course.id);

      return {
        course: mapCourse(r.course, r.instructorName, r.seriesName),
        enrollmentCount: stats?.enrollment_count ?? 0,
        avgPercent: stats?.avg_percent ?? 0,
        certificateCount: stats?.certificate_count ?? 0,
      };
    });
  });
}

// ---------------------------------------------------------------------------
// Editor de curso (instrutor) — módulos, aulas (qualquer status).
// ---------------------------------------------------------------------------

export interface CourseEditorData {
  course: Course;
  modules: CourseModule[];
  lessons: Lesson[];
}

export async function getCourseForEditor(
  actorId: string,
  courseId: string,
): Promise<CourseEditorData | null> {
  return withAuthenticatedContext({ actorId }, async (tx) => {
    // Mesmo motivo de getInstructorDashboardCourses: courses_mutate_staff
    // não filtra archived_at, então curso/módulo/aula arquivado precisa
    // sair explicitamente das três leituras abaixo para o editor não os
    // listar mais.
    const courseRows = await tx
      .select({
        course: courses,
        instructorName: instructors.name,
        seriesName: series.name,
      })
      .from(courses)
      .leftJoin(instructors, eq(instructors.id, courses.instructorId))
      .leftJoin(series, eq(series.id, courses.seriesId))
      .where(and(eq(courses.id, courseId), isNull(courses.archivedAt)))
      .limit(1);
    const courseRow = courseRows[0];
    if (!courseRow) return null;

    const moduleRows = await tx
      .select()
      .from(modules)
      .where(and(eq(modules.courseId, courseId), isNull(modules.archivedAt)))
      .orderBy(asc(modules.order));
    const lessonRows = await tx
      .select()
      .from(lessons)
      .where(and(eq(lessons.courseId, courseId), isNull(lessons.archivedAt)))
      .orderBy(asc(lessons.order));

    const quizLessonIds = lessonRows
      .filter((l) => l.type === "quiz")
      .map((l) => l.id);
    const quizRows =
      quizLessonIds.length > 0
        ? await tx
            .select({ id: quizzes.id, lessonId: quizzes.lessonId })
            .from(quizzes)
            .where(inArray(quizzes.lessonId, quizLessonIds))
        : [];
    const quizIdByLessonId = new Map(quizRows.map((q) => [q.lessonId, q.id]));

    return {
      course: mapCourse(
        courseRow.course,
        courseRow.instructorName,
        courseRow.seriesName,
      ),
      modules: moduleRows,
      lessons: lessonRows.map((row) =>
        mapLesson(row, quizIdByLessonId.get(row.id) ?? null),
      ),
    };
  });
}

// ---------------------------------------------------------------------------
// Editor de aula (instrutor).
// ---------------------------------------------------------------------------

export interface LessonEditorData {
  course: Course;
  lesson: Lesson;
}

export async function getLessonForEditor(
  actorId: string,
  courseId: string,
  lessonId: string,
): Promise<LessonEditorData | null> {
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const courseRows = await tx
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);
    const courseRow = courseRows[0];
    if (!courseRow) return null;

    const lessonRows = await tx
      .select()
      .from(lessons)
      .where(and(eq(lessons.id, lessonId), eq(lessons.courseId, courseId)))
      .limit(1);
    const lessonRow = lessonRows[0];
    if (!lessonRow) return null;

    let quizId: string | null = null;
    if (lessonRow.type === "quiz") {
      const quizRows = await tx
        .select({ id: quizzes.id })
        .from(quizzes)
        .where(eq(quizzes.lessonId, lessonRow.id))
        .limit(1);
      quizId = quizRows[0]?.id ?? null;
    }

    return {
      course: mapCourse(courseRow, null, null),
      lesson: mapLesson(lessonRow, quizId),
    };
  });
}

// ---------------------------------------------------------------------------
// Editor de quiz (instrutor) — "novo" (por lessonId) ou edição (por quizId).
// ---------------------------------------------------------------------------

export interface QuizEditorData {
  course: Course;
  lesson: Lesson;
  quiz: Quiz | null;
}

async function buildQuizEditorData(
  tx: Parameters<Parameters<typeof withAuthenticatedContext>[1]>[0],
  courseRow: CourseRow,
  lessonRow: LessonRow,
): Promise<QuizEditorData> {
  const quizRows = await tx
    .select()
    .from(quizzes)
    .where(eq(quizzes.lessonId, lessonRow.id))
    .limit(1);
  const quizRow = quizRows[0];

  let quiz: Quiz | null = null;
  if (quizRow) {
    const questionRows = await tx
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizRow.id))
      .orderBy(asc(quizQuestions.order));

    quiz = {
      id: quizRow.id,
      lessonId: quizRow.lessonId,
      passingScore: quizRow.passingScore,
      questions: questionRows.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        correctOptionId: q.correctOptionId,
      })),
      createdAt: quizRow.createdAt,
      updatedAt: quizRow.updatedAt,
    };
  }

  return {
    course: mapCourse(courseRow, null, null),
    lesson: mapLesson(lessonRow, quizRow?.id ?? null),
    quiz,
  };
}

export async function getQuizEditorDataForLesson(
  actorId: string,
  courseId: string,
  lessonId: string,
): Promise<QuizEditorData | null> {
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const courseRows = await tx
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);
    const courseRow = courseRows[0];
    if (!courseRow) return null;

    const lessonRows = await tx
      .select()
      .from(lessons)
      .where(
        and(
          eq(lessons.id, lessonId),
          eq(lessons.courseId, courseId),
          eq(lessons.type, "quiz"),
        ),
      )
      .limit(1);
    const lessonRow = lessonRows[0];
    if (!lessonRow) return null;

    return buildQuizEditorData(tx, courseRow, lessonRow);
  });
}

export async function getQuizEditorDataByQuizId(
  actorId: string,
  courseId: string,
  quizId: string,
): Promise<QuizEditorData | null> {
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const quizRows = await tx
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);
    const quizRow = quizRows[0];
    if (!quizRow) return null;

    const lessonRows = await tx
      .select()
      .from(lessons)
      .where(
        and(eq(lessons.id, quizRow.lessonId), eq(lessons.courseId, courseId)),
      )
      .limit(1);
    const lessonRow = lessonRows[0];
    if (!lessonRow) return null;

    const courseRows = await tx
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);
    const courseRow = courseRows[0];
    if (!courseRow) return null;

    return buildQuizEditorData(tx, courseRow, lessonRow);
  });
}
