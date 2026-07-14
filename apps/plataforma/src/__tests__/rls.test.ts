/**
 * rls.test.ts — Políticas RLS do módulo plataforma (P-6.7,
 * migration 0020_plataforma_rls.sql)
 *
 * Testa via conexão direta (postgres.js) com SET LOCAL ROLE authenticated
 * e request.jwt.claims para simular diferentes usuários — mesmo padrão de
 * apps/tarefas/src/__tests__/rls.test.ts.
 *
 * Cobertura (P-6.12):
 *  - courses_select_published: aluno só vê cursos publicados, nunca
 *    rascunhos (mesmo sem matrícula — catálogo é aberto a qualquer
 *    registrado, BRAIN §6.3).
 *  - progress_select_own: aluno só vê o próprio progresso, nunca o de
 *    outro aluno.
 *  - discussion_posts: moderação — só o autor edita o próprio post; só
 *    super_admin edita/remove post alheio (discussion_posts_mutate_admin /
 *    discussion_posts_update_own, 0020_plataforma_rls.sql).
 *  - anon: sem GRANT de tabela no schema plataforma (só USAGE do schema,
 *    liberado para a verificação pública de certificado).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  instructors,
  courses,
  modules,
  lessons,
  enrollments,
  progress,
  discussions,
  discussionPosts,
  auditLog,
} from "@hebron/db/schema";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const IDS = {
  users: {
    superAdmin: "9a000000-0000-0000-0000-000000000001",
    studentA: "9a000000-0000-0000-0000-000000000002",
    studentB: "9a000000-0000-0000-0000-000000000003",
  },
  instructor: "9a100000-0000-0000-0000-000000000001",
  courses: {
    published: "9a200000-0000-0000-0000-000000000001",
    draft: "9a200000-0000-0000-0000-000000000002",
  },
  modules: {
    published: "9a300000-0000-0000-0000-000000000001",
  },
  lessons: {
    published: "9a400000-0000-0000-0000-000000000001",
  },
  progress: {
    studentA: "9a500000-0000-0000-0000-000000000001",
    studentB: "9a500000-0000-0000-0000-000000000002",
  },
  discussion: "9a600000-0000-0000-0000-000000000001",
  posts: {
    forUpdateTest: "9a700000-0000-0000-0000-000000000001",
    forDeleteTest: "9a700000-0000-0000-0000-000000000002",
  },
} as const;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for RLS tests");
const sql = postgres(DATABASE_URL, { prepare: false, max: 3 });

// ── Helpers ───────────────────────────────────────────────────────────────────

async function queryAs(userId: string, query: string): Promise<postgres.Row[]> {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  let rows: postgres.Row[] = [];

  try {
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
      rows = await tx.unsafe(query);
      throw new Error("__rls_test_rollback__");
    });
  } catch (err) {
    if (err instanceof Error && err.message !== "__rls_test_rollback__") {
      throw err;
    }
  }

  return rows;
}

async function queryAsAnon(query: string): Promise<postgres.Row[]> {
  let rows: postgres.Row[] = [];
  try {
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE anon`;
      rows = await tx.unsafe(query);
      throw new Error("__rls_test_rollback__");
    });
  } catch (err) {
    if (err instanceof Error && err.message !== "__rls_test_rollback__") {
      throw err;
    }
  }
  return rows;
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.users.superAdmin,
        email: "rls-plat-super@test.hebron",
        fullName: "RLS Plataforma SuperAdmin",
      },
      {
        id: IDS.users.studentA,
        email: "rls-plat-aluno-a@test.hebron",
        fullName: "RLS Plataforma Aluno A",
      },
      {
        id: IDS.users.studentB,
        email: "rls-plat-aluno-b@test.hebron",
        fullName: "RLS Plataforma Aluno B",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values({
      userId: IDS.users.superAdmin,
      role: "super_admin",
      grantedBy: IDS.users.superAdmin,
    })
    .onConflictDoNothing();

  await db
    .insert(instructors)
    .values({ id: IDS.instructor, name: "RLS Plataforma Instrutor" })
    .onConflictDoNothing();

  await db
    .insert(courses)
    .values([
      {
        id: IDS.courses.published,
        title: "Curso Publicado RLS",
        slug: "curso-publicado-rls",
        description: "Curso usado no teste de RLS",
        category: "teste",
        instructorId: IDS.instructor,
        published: true,
      },
      {
        id: IDS.courses.draft,
        title: "Curso Rascunho RLS",
        slug: "curso-rascunho-rls",
        description: "Curso rascunho, nunca deve aparecer para aluno",
        category: "teste",
        instructorId: IDS.instructor,
        published: false,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(modules)
    .values({
      id: IDS.modules.published,
      courseId: IDS.courses.published,
      title: "Módulo único",
      order: 0,
    })
    .onConflictDoNothing();

  await db
    .insert(lessons)
    .values({
      id: IDS.lessons.published,
      moduleId: IDS.modules.published,
      courseId: IDS.courses.published,
      title: "Aula única",
      type: "video",
      order: 0,
    })
    .onConflictDoNothing();

  await db
    .insert(enrollments)
    .values([
      { userId: IDS.users.studentA, courseId: IDS.courses.published },
      { userId: IDS.users.studentB, courseId: IDS.courses.published },
    ])
    .onConflictDoNothing();

  await db
    .insert(progress)
    .values([
      {
        id: IDS.progress.studentA,
        userId: IDS.users.studentA,
        lessonId: IDS.lessons.published,
        courseId: IDS.courses.published,
        completedAt: new Date(),
      },
      {
        id: IDS.progress.studentB,
        userId: IDS.users.studentB,
        lessonId: IDS.lessons.published,
        courseId: IDS.courses.published,
        completedAt: new Date(),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(discussions)
    .values({
      id: IDS.discussion,
      lessonId: IDS.lessons.published,
      courseId: IDS.courses.published,
    })
    .onConflictDoNothing();

  await db
    .insert(discussionPosts)
    .values([
      {
        id: IDS.posts.forUpdateTest,
        discussionId: IDS.discussion,
        authorId: IDS.users.studentA,
        content: "Post de A — para teste de update",
      },
      {
        id: IDS.posts.forDeleteTest,
        discussionId: IDS.discussion,
        authorId: IDS.users.studentA,
        content: "Post de A — para teste de delete",
      },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(auditLog)
    .where(inArray(auditLog.actorId, Object.values(IDS.users)));
  await db
    .delete(courses)
    .where(inArray(courses.id, Object.values(IDS.courses)));
  await db.delete(instructors).where(eq(instructors.id, IDS.instructor));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.users.superAdmin));
  await db.delete(users).where(inArray(users.id, Object.values(IDS.users)));
  await sql.end();
});

// ── courses_select_published ──────────────────────────────────────────────────

describe("RLS — courses_select_published: aluno só vê cursos publicados", () => {
  it("aluno vê o curso publicado", async () => {
    const rows = await queryAs(
      IDS.users.studentA,
      `SELECT id FROM plataforma.courses WHERE id = '${IDS.courses.published}'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("aluno NÃO vê o curso em rascunho", async () => {
    const rows = await queryAs(
      IDS.users.studentA,
      `SELECT id FROM plataforma.courses WHERE id = '${IDS.courses.draft}'`,
    );
    expect(rows).toHaveLength(0);
  });
});

// ── progress_select_own ───────────────────────────────────────────────────────

describe("RLS — progress_select_own: aluno não vê progresso de outro aluno", () => {
  it("studentA vê o próprio progresso", async () => {
    const rows = await queryAs(
      IDS.users.studentA,
      `SELECT id FROM plataforma.progress WHERE id = '${IDS.progress.studentA}'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("studentA NÃO vê o progresso de studentB", async () => {
    const rows = await queryAs(
      IDS.users.studentA,
      `SELECT id FROM plataforma.progress WHERE id = '${IDS.progress.studentB}'`,
    );
    expect(rows).toHaveLength(0);
  });

  it("studentB NÃO vê o progresso de studentA", async () => {
    const rows = await queryAs(
      IDS.users.studentB,
      `SELECT id FROM plataforma.progress WHERE id = '${IDS.progress.studentA}'`,
    );
    expect(rows).toHaveLength(0);
  });
});

// ── discussion_posts: moderação ───────────────────────────────────────────────

describe("RLS — discussion_posts: só o autor edita o próprio post; moderação só super_admin", () => {
  it("studentA (autor) edita o próprio post", async () => {
    const rows = await queryAs(
      IDS.users.studentA,
      `UPDATE plataforma.discussion_posts SET content = 'Editado por A' WHERE id = '${IDS.posts.forUpdateTest}' RETURNING id`,
    );
    expect(rows).toHaveLength(1);
  });

  it("studentB NÃO edita post de studentA (não é autor nem super_admin)", async () => {
    const rows = await queryAs(
      IDS.users.studentB,
      `UPDATE plataforma.discussion_posts SET content = 'Hackeado' WHERE id = '${IDS.posts.forUpdateTest}' RETURNING id`,
    );
    expect(rows).toHaveLength(0);
  });

  it("studentB NÃO remove post de studentA (sem policy de DELETE para não-autor)", async () => {
    const rows = await queryAs(
      IDS.users.studentB,
      `DELETE FROM plataforma.discussion_posts WHERE id = '${IDS.posts.forDeleteTest}' RETURNING id`,
    );
    expect(rows).toHaveLength(0);
  });

  it("super_admin remove post de studentA (moderação, discussion_posts_mutate_admin)", async () => {
    const rows = await queryAs(
      IDS.users.superAdmin,
      `DELETE FROM plataforma.discussion_posts WHERE id = '${IDS.posts.forDeleteTest}' RETURNING id`,
    );
    expect(rows).toHaveLength(1);
  });
});

// ── anon: sem GRANT de tabela no schema plataforma ────────────────────────────

describe("RLS — anon não lê tabelas de plataforma.* (só USAGE de schema, sem GRANT de tabela)", () => {
  it("anon NÃO lê plataforma.courses (permission denied — sem GRANT na tabela)", async () => {
    await expect(
      queryAsAnon("SELECT id FROM plataforma.courses LIMIT 10"),
    ).rejects.toThrow(/permission denied for (table|relation) courses/i);
  });
});
