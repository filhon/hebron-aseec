/**
 * projetos-flats.test.ts — getProjectParticipationScore, Projetos → Flats
 *
 * Sem mock: roda contra o banco real. Cobre o critério de aceite de P-7.11
 * "critério j auto-calculado": `apps/flats/src/actions/scoring.ts::
 * computeScoringResponses` deriva o critério j
 * (`participated = totalApprovedOrExecuted > 0`) diretamente do valor
 * retornado por esta função (consumida desde P-7.8) — este teste garante
 * que um usuário com projeto "aprovado" produz `totalApprovedOrExecuted > 0`,
 * o mesmo dado que vira 5 pontos no critério j.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { projects, users } from "@hebron/db/schema";
import { getProjectParticipationScore } from "../projetos-flats";

const SUBMITTER_ID = "f7110000-0000-0000-0000-000000000003";
const SUBMITTER_EMAIL = "flats-cross-test-projetos@test.hebron";
const PROJECT_ID = "f7110000-0000-0000-0000-000000000004";

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: SUBMITTER_ID,
      email: SUBMITTER_EMAIL,
      fullName: "Flats Cross Test Projetos",
    })
    .onConflictDoNothing();

  await db
    .insert(projects)
    .values({
      id: PROJECT_ID,
      title: "Projeto de teste — critério j",
      tipo: "pontual",
      stage: "aprovado",
      submitterId: SUBMITTER_ID,
      budgetTotal: "1000.00",
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(projects).where(eq(projects.id, PROJECT_ID));
  await db.delete(users).where(eq(users.id, SUBMITTER_ID));
});

describe("getProjectParticipationScore", () => {
  it("retorna totalApprovedOrExecuted > 0 para usuário com projeto aprovado (alimenta o critério j)", async () => {
    const score = await getProjectParticipationScore(SUBMITTER_ID);

    expect(score.activeProjects).toBe(1);
    expect(score.totalApprovedOrExecuted).toBe(1);
    expect(score.totalBudgetApproved).toBe(1000);
    expect(score.completedProjects).toBe(0);

    const participated = score.totalApprovedOrExecuted > 0;
    expect(participated).toBe(true);
  });
});
