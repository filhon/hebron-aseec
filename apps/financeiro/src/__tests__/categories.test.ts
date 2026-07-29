/**
 * categories.test.ts — P-3.3b (CORRETIVO)
 *
 * category-tree.tsx guardava a ordem dos irmãos num orderMap de estado local
 * inicializado uma única vez a partir do primeiro render; applyOrder
 * descartava em silêncio todo id que não estivesse nesse mapa — uma
 * categoria-raiz nova, ou uma subcategoria criada sob um pai que já tinha
 * filhos, nunca aparecia na árvore até um reload completo da página. Este
 * teste cobre a saída escolhida (b, remoção da alça): a query devolve a
 * categoria recém-criada — a árvore (montada em category-tree.tsx a partir
 * desse array, ordenando só por code) passa a incluí-la de imediato, sem
 * depender de nenhum mapa local.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  financialCategories,
  auditLog,
} from "@hebron/db/schema";
import type { Role } from "@hebron/types/roles";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

const ACTOR_ID = "cbca0000-0000-0000-0000-000000000001";
const ROOT_CODE = "97";
const CHILD_A_CODE = "97.1";
const CHILD_B_CODE = "97.2";

// resolveSession é mockado sem valor default (vi.fn() vazio) porque
// vi.mock é hoisted para o topo do arquivo — um .mockResolvedValue(...) já
// dentro da factory tentaria capturar ACTOR_ID antes da sua inicialização.
// Cada chamada que percorre safe-action.ts/getActorId consome exatamente
// um resolveSession — chamar antes de cada uma via mockResolvedValueOnce.
async function actingAsActor() {
  const { resolveSession } = await import("@hebron/auth/server");
  vi.mocked(resolveSession).mockResolvedValueOnce({
    actorId: ACTOR_ID,
    roles: ["diretor"] as Role[],
    designations: [],
  });
}

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: ACTOR_ID,
      email: "categories-test-actor@test.hebron",
      fullName: "Categories Test Actor",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: ACTOR_ID, role: "diretor", grantedBy: ACTOR_ID })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(financialCategories)
    .where(eq(financialCategories.code, CHILD_B_CODE));
  await db
    .delete(financialCategories)
    .where(eq(financialCategories.code, CHILD_A_CODE));
  await db
    .delete(financialCategories)
    .where(eq(financialCategories.code, ROOT_CODE));
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, ACTOR_ID));
  // createCategory grava audit_log — precisa limpar antes de apagar o user,
  // senão a FK audit_log_actor_id_fkey barra (mesmo padrão de
  // confirm-import.test.ts).
  await db.delete(auditLog).where(eq(auditLog.actorId, ACTOR_ID));
  await db.delete(users).where(eq(users.id, ACTOR_ID));
});

describe("createCategory + getCategories — categoria nova consta da árvore (P-3.3b)", () => {
  it("categoria-raiz criada aparece na árvore devolvida pela query, sem reload", async () => {
    const { createCategory } = await import("../actions/categories");
    const { getCategories } = await import("../lib/queries");

    await actingAsActor();
    const created = await createCategory({
      code: ROOT_CODE,
      name: "Categoria de Teste P-3.3b",
      type: "despesa",
      parentId: null,
    });
    expect(created?.serverError).toBeUndefined();

    await actingAsActor();
    const categories = await getCategories();

    expect(categories.some((c) => c.code === ROOT_CODE)).toBe(true);
  });

  it("subcategoria criada sob um pai que já tem filhos aparece na árvore", async () => {
    const { createCategory } = await import("../actions/categories");
    const { getCategories } = await import("../lib/queries");

    await actingAsActor();
    const root = (await getCategories()).find((c) => c.code === ROOT_CODE);
    if (!root) throw new Error("Categoria-raiz de teste não encontrada");

    await actingAsActor();
    const firstChild = await createCategory({
      code: CHILD_A_CODE,
      name: "Subcategoria A",
      type: "despesa",
      parentId: root.id,
    });
    expect(firstChild?.serverError).toBeUndefined();

    // root já tem um filho (CHILD_A) quando o segundo é criado — é
    // exatamente o cenário que o orderMap descartava em silêncio.
    await actingAsActor();
    const secondChild = await createCategory({
      code: CHILD_B_CODE,
      name: "Subcategoria B",
      type: "despesa",
      parentId: root.id,
    });
    expect(secondChild?.serverError).toBeUndefined();

    await actingAsActor();
    const categories = await getCategories();

    // Prova que a query devolve os dois filhos com o parentId correto —
    // é exatamente o array que category-tree.tsx usa para montar a árvore
    // (buildTree), sem nenhum mapa local a filtrar por lista de ids.
    const childCodes = categories
      .filter((c) => c.parentId === root.id)
      .map((c) => c.code);
    expect(childCodes).toEqual(
      expect.arrayContaining([CHILD_A_CODE, CHILD_B_CODE]),
    );
  });
});
