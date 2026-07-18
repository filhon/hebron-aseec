import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { resolveSession } from "@hebron/auth/server";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { users, roleAssignments } from "@hebron/db/schema";

/** Usuários com papel "diretor" — únicos que podem presidir reuniões (BRAIN §6.1). */
export async function getDirectors(): Promise<{ id: string; name: string }[]> {
  const cookieStore = await cookies();
  const { actorId } = await resolveSession(cookieStore);

  const rows = await withAuthenticatedContext({ actorId }, (tx) =>
    tx
      .selectDistinct({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      })
      .from(roleAssignments)
      .innerJoin(users, eq(roleAssignments.userId, users.id))
      .where(eq(roleAssignments.role, "diretor")),
  );

  return rows.map((r) => ({ id: r.id, name: r.fullName ?? r.email }));
}
