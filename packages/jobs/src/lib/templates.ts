import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { emailTemplates } from "@hebron/db/schema";

/**
 * Mesmo padrão de override editável-no-Admin já usado em
 * `apps/{projetos,documentos}/src/lib/notifications.ts` — repetido aqui (não
 * extraído para um package compartilhado) porque é ~15 linhas por app/job e
 * a extração criaria uma dependência de `@hebron/email` sobre `@hebron/db`
 * (inversão: `@hebron/db` já depende de `@hebron/email` para os templates
 * default).
 */
export async function getDbTemplate(
  slug: string,
): Promise<{ subject: string; bodyHtml: string } | null> {
  const [row] = await db
    .select({
      subject: emailTemplates.subject,
      bodyHtml: emailTemplates.bodyHtml,
    })
    .from(emailTemplates)
    .where(eq(emailTemplates.slug, slug))
    .limit(1);
  return row ?? null;
}

export function applyVars(
  tpl: { subject: string; bodyHtml: string },
  vars: Record<string, string>,
): { subject: string; html: string } {
  const sub = (t: string) =>
    t.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? `{{${k}}}`);
  return { subject: sub(tpl.subject), html: sub(tpl.bodyHtml) };
}
