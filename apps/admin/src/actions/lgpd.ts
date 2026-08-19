"use server";

import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  executeDataDeletion,
  rejectDataDeletion,
} from "@hebron/auth/data-deletion";
import { adminAction } from "../lib/safe-action";
import { notifyDeletionRejected } from "../lib/notifications";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variáveis Supabase não configuradas");
  return createClient(url, key, { auth: { persistSession: false } });
}

// GoTrue não expõe "banimento indefinido" — só duração (AdminUserAttributes
// #ban_duration). ~100 anos equivale, na prática, a desativar o login
// permanentemente, sem inventar um terceiro estado ausente do modelo do
// Supabase Auth.
const PERMANENT_BAN_DURATION = "876000h";

// ─── resolveDeletionRequest ─────────────────────────────────────────────────
// Executa um pedido de exclusão pendente (D8-001): anonimiza a PII de
// verdade via executeDataDeletion (que reusa anonymizeUser, P-0.13) e
// desativa o login em auth.users via Supabase Admin API — o efeito externo
// que a primitiva de @hebron/auth deliberadamente deixa fora da camada de
// dados (ver data-deletion.ts).

export const resolveDeletionRequest = adminAction
  .schema(z.object({ requestId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = getSupabaseAdmin();

    const result = await executeDataDeletion({
      requestId: parsedInput.requestId,
      adminId: ctx.actorId,
      disableLogin: async (userId) => {
        const { error } = await supabase.auth.admin.updateUserById(userId, {
          ban_duration: PERMANENT_BAN_DURATION,
        });
        if (error) throw new Error(error.message);
      },
    });

    return { requestId: result.requestId };
  });

// ─── rejectDeletionRequest ──────────────────────────────────────────────────
// Recusa um pedido quando há base legal para reter os dados (LGPD art. 16).
// A justificativa é obrigatória — vira o resolutionNotes do ticket e o corpo
// da notificação enviada ao titular.

export const rejectDeletionRequest = adminAction
  .schema(
    z.object({
      requestId: z.string().uuid(),
      notes: z
        .string()
        .trim()
        .min(10, "Descreva a base legal para reter os dados"),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const request = await rejectDataDeletion({
      requestId: parsedInput.requestId,
      adminId: ctx.actorId,
      notes: parsedInput.notes,
    });

    await notifyDeletionRejected(request.userId, parsedInput.notes);

    return { request };
  });
