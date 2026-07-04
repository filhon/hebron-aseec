"use server";

import { z } from "zod";
import { authenticatedAction } from "../lib/safe-action";
import { logIntranetAudit } from "../lib/audit";

/**
 * Records the audit trail for a TOTP enrollment that already succeeded
 * client-side (Supabase Auth has no server-side webhook for this) — called
 * right after `verifytotpEnrollment` resolves without error.
 */
export const confirmMfaEnrollment = authenticatedAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    await logIntranetAudit({
      actorId: ctx.actorId,
      action: "mfa.enrolled",
      entity: "user",
      entityId: ctx.actorId,
      diff: { after: { mfaEnrolled: true } },
    });
    return { ok: true };
  });
