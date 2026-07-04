import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, roleAssignments } from "@hebron/db/schema";

/** Usuários com papel "diretor" — únicos que podem presidir reuniões (BRAIN §6.1). */
export async function getDirectors(): Promise<{ id: string; name: string }[]> {
  const rows = await db
    .selectDistinct({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
    })
    .from(roleAssignments)
    .innerJoin(users, eq(roleAssignments.userId, users.id))
    .where(eq(roleAssignments.role, "diretor"));

  return rows.map((r) => ({ id: r.id, name: r.fullName ?? r.email }));
}
