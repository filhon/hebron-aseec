"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { briefingPreferences } from "@hebron/db/schema";
import { staffAction } from "../lib/safe-action";

// ---------------------------------------------------------------------------
// Preferência de briefing (intranet.briefing_preferences) — não estava na
// lista de arquivos permitidos de P-5.9 (só announcements/dashboard/decisions/
// kpis/search foram cobertos em P-5.8), mas briefing-config-form.tsx (P-5.4)
// não tem nenhuma action para se conectar — gap de infraestrutura registrado
// em SESSIONS.md (G1). RLS já cobre esta tabela (0037_intranet_rls.sql:
// briefing_preferences_write_own), então staffAction + upsert por user_id é
// suficiente; sem audit log aqui — é preferência pessoal, não há valor de
// admin.audit_action para isso e não é decisão de governança (BRAIN §
// "governança dual" cobre financeiro/votação/aprovações, não preferências de
// notificação).
// ---------------------------------------------------------------------------

const saveBriefingPreferenceSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(["diario", "semanal"]),
});

export type SaveBriefingPreferenceInput = z.infer<
  typeof saveBriefingPreferenceSchema
>;

export const getBriefingPreference = staffAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(briefingPreferences)
      .where(eq(briefingPreferences.userId, ctx.actorId))
      .limit(1);

    return { preference: rows[0] ?? null };
  });

export const saveBriefingPreference = staffAction
  .schema(saveBriefingPreferenceSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const [preference] = await db
      .insert(briefingPreferences)
      .values({
        userId: ctx.actorId,
        enabled: input.enabled,
        frequency: input.frequency,
      })
      .onConflictDoUpdate({
        target: briefingPreferences.userId,
        set: {
          enabled: input.enabled,
          frequency: input.frequency,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!preference) throw new Error("Falha ao salvar preferência de briefing");

    return { preference };
  });
