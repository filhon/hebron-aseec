// ——————————————————————————————————————
// interpolateStoredTemplate
// ——————————————————————————————————————
//
// Interpola {{chave}} num template salvo em admin.email_templates (P-1.10c).
// Este pacote permanece agnóstico a banco: quem lê a linha é o caller
// (Server Action) via `@hebron/db/email-templates`; aqui só se substitui
// placeholders e se retorna o resultado pronto para `SendEmailOptions.html`.

export interface StoredEmailTemplate {
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

export interface InterpolatedEmail {
  subject: string;
  html: string;
  text: string;
}

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Placeholders sem entrada em `variables` ficam intactos no texto de saída
 * (ex.: `{{campo_sem_valor}}`) — decisão deliberada: um dado faltante fica
 * visível no email renderizado em vez de virar um buraco silencioso na
 * frase.
 */
function interpolate(
  text: string,
  variables: Record<string, string>,
  escape: (value: string) => string,
): string {
  return text.replace(PLACEHOLDER_RE, (match, key: string) => {
    if (!(key in variables)) return match;
    return escape(variables[key] ?? "");
  });
}

export function interpolateStoredTemplate(
  template: StoredEmailTemplate,
  variables: Record<string, string>,
): InterpolatedEmail {
  return {
    subject: interpolate(template.subject, variables, (v) => v),
    html: interpolate(template.bodyHtml, variables, escapeHtml),
    text: interpolate(template.bodyText, variables, (v) => v),
  };
}
