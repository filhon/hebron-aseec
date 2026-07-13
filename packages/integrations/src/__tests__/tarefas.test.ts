/**
 * tarefas.test.ts — createAutoTask, consumo Intranet → Tarefas (P-5.11)
 *
 * Sem mock: roda contra o banco real. `apps/intranet/src/actions/
 * decisions.ts::createMeetingDecision` (P-5.8) já chama `createAutoTask`
 * com exatamente estes parâmetros (workspace "administrativo", sourceModule
 * "intranet", sourceId = id da decisão) quando o presidente de sessão marca
 * "criar tarefa" ao registrar uma decisão de reunião — este teste cobre o
 * critério de aceite "decisão de reunião cria tarefa via packages/
 * integrations (teste end-to-end)" exercitando o mesmo contrato sem
 * depender do Server Action (fora da lista de arquivos permitidos deste
 * prompt e não invocável fora de um request Next.js).
 */
import { describe, it, expect, afterAll } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { tasks } from "@hebron/db/schema";
import { createAutoTask } from "../tarefas";

const DECISION_ID = "fe000000-0000-0000-0000-0000000000d1";

afterAll(async () => {
  await db
    .delete(tasks)
    .where(sql`${tasks.sourceRef} ->> 'sourceId' = ${DECISION_ID}`);
});

describe("createAutoTask — consumo Intranet → Tarefas", () => {
  it("cria tarefa avulsa a partir de uma decisão de reunião", async () => {
    const { taskId } = await createAutoTask({
      title: "Decisão de reunião: revisar contrato de manutenção",
      workspace: "administrativo",
      dueDate: null,
      sourceModule: "intranet",
      sourceId: DECISION_ID,
    });

    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

    expect(task).toBeDefined();
    expect(task?.source).toBe("auto");
    expect(task?.needsManualAssignment).toBe(true);
    expect(task?.sourceRef).toEqual({
      sourceModule: "intranet",
      sourceId: DECISION_ID,
    });
  });
});
