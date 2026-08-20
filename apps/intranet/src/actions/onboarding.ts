"use server";

import { z } from "zod";
import { authenticatedAction } from "../lib/safe-action";
import { getSessionSupabaseClient } from "../lib/session-client";
import { logIntranetAudit } from "../lib/audit";
import { notifySignupPendingReview } from "../lib/notifications";
import { BusinessError } from "@hebron/auth/safe-action-error";

// ─── searchOrganizationsForSignup ────────────────────────────────────────────
// Usa a RPC SECURITY DEFINER (só funciona enquanto o próprio usuário está
// pending_approval — ver 0015_user_status.sql) para permitir que alguém sem
// nenhum papel ainda busque instituições já cadastradas.

export const searchOrganizationsForSignup = authenticatedAction
  .schema(z.object({ query: z.string().min(2).max(120) }))
  .action(async ({ parsedInput }) => {
    const supabase = await getSessionSupabaseClient();
    const { data, error } = await supabase.rpc(
      "search_organizations_for_signup",
      { _query: parsedInput.query },
    );

    if (error) throw new BusinessError(error.message);
    return {
      organizations: (data ?? []) as Array<{
        id: string;
        nome: string;
        cnpj: string | null;
      }>,
    };
  });

// ─── completeSignupOrganization ──────────────────────────────────────────────

const completeSignupOrganizationSchema = z
  .object({
    existingOrganizationId: z.string().uuid().optional(),
    newOrganizationName: z.string().min(2).max(255).optional(),
    newOrganizationCnpj: z.string().max(20).optional(),
  })
  .refine(
    (v) => Boolean(v.existingOrganizationId) || Boolean(v.newOrganizationName),
    {
      message: "Selecione uma instituição existente ou informe o nome da nova.",
    },
  );

export const completeSignupOrganization = authenticatedAction
  .schema(completeSignupOrganizationSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await getSessionSupabaseClient();

    const { data: organizationId, error } = await supabase.rpc(
      "self_signup_join_organization",
      {
        _existing_org_id: parsedInput.existingOrganizationId ?? null,
        _new_org_nome: parsedInput.newOrganizationName ?? null,
        _new_org_cnpj: parsedInput.newOrganizationCnpj ?? null,
      },
    );

    if (error) throw new BusinessError(error.message);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const organizationName =
      parsedInput.newOrganizationName ?? "instituição selecionada";

    await notifySignupPendingReview(
      user?.email ?? "",
      (user?.user_metadata?.["full_name"] as string | undefined) ??
        user?.email ??
        "",
      organizationName,
    );

    await logIntranetAudit({
      actorId: ctx.actorId,
      action: "user.signup_requested",
      entity: "user",
      entityId: ctx.actorId,
      diff: { after: { organizationId } },
    });

    return { organizationId: organizationId as string };
  });
