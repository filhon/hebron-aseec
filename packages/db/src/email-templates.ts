import { eq } from "drizzle-orm";
import { db } from "./client";
import { emailTemplates } from "./schema/admin";
import type { EmailTemplate } from "./schema/admin";

/**
 * Lê `admin.email_templates` por slug. Retorna `null` quando não houver
 * linha — o caller (Server Action) decide o fallback (componente React Email
 * hardcoded), este loader nunca lança para "template ausente".
 */
export async function getEmailTemplateBySlug(
  slug: string,
): Promise<EmailTemplate | null> {
  const [row] = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.slug, slug))
    .limit(1);

  return row ?? null;
}
