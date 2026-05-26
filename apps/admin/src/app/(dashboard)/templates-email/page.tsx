import Link from "next/link";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { createClient } from "@supabase/supabase-js";
import { emailTemplates, roleAssignments } from "@hebron/db/schema";
import type { EmailTemplateInput } from "@hebron/validators";
import type { EmailTemplate } from "@hebron/types/admin";
import { Mail, Check, AlertCircle } from "lucide-react";
import { EmailTemplateEditor } from "../../../components/email-template-editor";
import { EmailTemplatePreview } from "../../../components/email-template-preview";
import { logAudit } from "../../../lib/audit";

// ──────────────────────────────────────────────────────────────────────────────
// DB
// ──────────────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────────
// Template metadata
// ──────────────────────────────────────────────────────────────────────────────

type Slug = "invitation" | "welcome" | "password-reset";

const TEMPLATE_META: {
  slug: Slug;
  label: string;
  description: string;
  variables: string[];
}[] = [
  {
    slug: "invitation",
    label: "Convite de acesso",
    description: "Enviado ao convidar um novo usuário para a plataforma",
    variables: ["nome", "link", "papel"],
  },
  {
    slug: "welcome",
    label: "Boas-vindas",
    description: "Enviado quando o convite é aceito e a conta é ativada",
    variables: ["nome", "link", "papel"],
  },
  {
    slug: "password-reset",
    label: "Reset de senha",
    description: "Enviado ao solicitar redefinição de senha",
    variables: ["nome", "link"],
  },
];

const VALID_SLUGS: Slug[] = ["invitation", "welcome", "password-reset"];

function validateSlug(raw: string | undefined): Slug {
  if (raw && (VALID_SLUGS as string[]).includes(raw)) return raw as Slug;
  return "invitation";
}

// ──────────────────────────────────────────────────────────────────────────────
// Default template content
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATES: Record<
  Slug,
  { subject: string; bodyHtml: string; bodyText: string }
> = {
  invitation: {
    subject: "Convite para Hebron Aseec",
    bodyHtml: `<p>Olá,</p>
<p>{{nome}} convidou você para acessar a plataforma <strong>Hebron Aseec</strong>.</p>
<p><strong>Papel(éis) atribuído(s):</strong> {{papel}}</p>
<p style="margin-top:24px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Aceitar convite</a>
</p>
<p style="margin-top:20px;font-size:13px;color:#6B7280;">
  Este convite tem validade limitada. Se você não esperava este convite, ignore este e-mail.
</p>`,
    bodyText: `Olá,\n\n{{nome}} convidou você para acessar a plataforma Hebron Aseec.\n\nPapel(éis): {{papel}}\n\nAceite o convite em: {{link}}\n\nSe você não esperava este convite, ignore este e-mail.`,
  },
  welcome: {
    subject: "Bem-vindo(a) à Hebron Aseec",
    bodyHtml: `<p>Bem-vindo(a), <strong>{{nome}}</strong>!</p>
<p>Sua conta na plataforma <strong>Hebron Aseec</strong> foi ativada com sucesso.</p>
<p><strong>Acesso concedido:</strong> {{papel}}</p>
<p style="margin-top:24px;">
  <a href="{{link}}" style="background:#EA5A06;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Acessar plataforma</a>
</p>`,
    bodyText: `Bem-vindo(a), {{nome}}!\n\nSua conta foi ativada na plataforma Hebron Aseec.\n\nAcesso concedido: {{papel}}\n\nAcesse em: {{link}}`,
  },
  "password-reset": {
    subject: "Redefinição de senha — Hebron Aseec",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Recebemos uma solicitação para redefinir a senha da sua conta na plataforma <strong>Hebron Aseec</strong>.</p>
<p style="margin-top:24px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Redefinir senha</a>
</p>
<p style="margin-top:20px;font-size:13px;color:#6B7280;">
  Se você não fez esta solicitação, ignore este e-mail. Sua senha permanece inalterada.
</p>`,
    bodyText: `Olá, {{nome}},\n\nRecebemos uma solicitação para redefinir sua senha na plataforma Hebron Aseec.\n\nAcesse o link para redefinir: {{link}}\n\nSe você não fez esta solicitação, ignore este e-mail.`,
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function TemplatesEmailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeSlug = validateSlug(params.tab);

  // ── Fetch template from DB ──────────────────────────────────────────────────
  const rows = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.slug, activeSlug));

  const dbTemplate = rows[0];
  const defaults = DEFAULT_TEMPLATES[activeSlug];
  const activeMeta = TEMPLATE_META.find((m) => m.slug === activeSlug);
  if (!activeMeta) throw new Error(`Template não encontrado: ${activeSlug}`);

  const template: EmailTemplate = {
    id: dbTemplate?.id ?? "",
    key: activeSlug,
    subject: dbTemplate?.subject ?? defaults.subject,
    bodyHtml: dbTemplate?.bodyHtml ?? defaults.bodyHtml,
    bodyText: dbTemplate?.bodyText ?? defaults.bodyText,
    variables: dbTemplate?.variables ?? activeMeta.variables,
    updatedBy: dbTemplate?.updatedBy ?? "",
    updatedAt: dbTemplate?.updatedAt ?? new Date(),
  };

  const isCustomized = !!dbTemplate;

  // ── Server action ────────────────────────────────────────────────────────────
  // `activeSlug` is captured via closure and bound into the action at render time.

  async function saveTemplate(data: EmailTemplateInput) {
    "use server";

    // Auth: validate session and super_admin role
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error("Supabase não configurado");
    }

    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { cookie: cookieHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) throw new Error("Não autenticado");

    const roleRows = await db
      .select({ role: roleAssignments.role })
      .from(roleAssignments)
      .where(eq(roleAssignments.userId, user.id));

    if (!roleRows.some((r) => r.role === "super_admin")) {
      throw new Error(
        "Acesso negado: apenas super_admin pode editar templates",
      );
    }

    // Extract {{variable}} names from both subject and body
    const allText = `${data.subject} ${data.bodyHtml} ${data.bodyText}`;
    const vars = [
      ...new Set(
        (allText.match(/\{\{(\w+)\}\}/g) ?? []).map((m) => m.slice(2, -2)),
      ),
    ];

    // Upsert template (insert or update on slug conflict)
    await db
      .insert(emailTemplates)
      .values({
        slug: activeSlug,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        bodyText: data.bodyText,
        variables: vars,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: emailTemplates.slug,
        set: {
          subject: data.subject,
          bodyHtml: data.bodyHtml,
          bodyText: data.bodyText,
          variables: vars,
          updatedBy: user.id,
          updatedAt: new Date(),
        },
      });

    await logAudit({
      actorId: user.id,
      action: "email_template.updated",
      entity: "email_template",
      diff: { slug: activeSlug, subject: data.subject },
    });

    revalidatePath("/templates-email");
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="hb-page">
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "var(--color-primary, #202C85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Mail size={18} color="#fff" aria-hidden="true" />
          </div>
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--color-foreground, #111827)",
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              Templates de e-mail
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--color-muted-foreground, #6B7280)",
                margin: "2px 0 0",
              }}
            >
              Textos padrão dos e-mails enviados pela plataforma. Editáveis
              apenas por super_admin.
            </p>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <nav
        aria-label="Templates de e-mail"
        style={{
          display: "flex",
          gap: 2,
          marginBottom: 20,
          background: "var(--color-surface, #F9FAFB)",
          border: "1px solid var(--color-border, #E5E7EB)",
          borderRadius: 10,
          padding: 4,
          width: "fit-content",
        }}
      >
        {TEMPLATE_META.map((meta) => {
          const active = meta.slug === activeSlug;
          return (
            <Link
              key={meta.slug}
              href={`/templates-email?tab=${meta.slug}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 16px",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active
                  ? "var(--color-primary, #202C85)"
                  : "var(--color-muted-foreground, #6B7280)",
                background: active ? "#fff" : "transparent",
                textDecoration: "none",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
              aria-current={active ? "page" : undefined}
            >
              {meta.label}
            </Link>
          );
        })}
      </nav>

      {/* Active template status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          padding: "8px 12px",
          borderRadius: 8,
          background: isCustomized ? "#F0FDF4" : "#FFFBEB",
          border: `1px solid ${isCustomized ? "#BBF7D0" : "#FDE68A"}`,
          fontSize: 12,
          color: isCustomized ? "#15803D" : "#92400E",
        }}
        role="status"
      >
        {isCustomized ? (
          <>
            <Check size={13} aria-hidden="true" />
            Template personalizado — última edição em{" "}
            {template.updatedAt.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </>
        ) : (
          <>
            <AlertCircle size={13} aria-hidden="true" />
            Usando texto padrão — salve para personalizar este template
          </>
        )}
      </div>

      {/* Editor card */}
      <div className="hb-card" style={{ marginBottom: 20 }}>
        <div className="hb-card-header">
          <div>
            <h3 style={{ margin: 0 }}>{activeMeta.label}</h3>
            <p
              style={{
                fontSize: 12,
                color: "var(--color-muted-foreground, #6B7280)",
                margin: "2px 0 0",
              }}
            >
              {activeMeta.description}
            </p>
          </div>
        </div>
        <div className="hb-card-body">
          <EmailTemplateEditor template={template} onSubmit={saveTemplate} />
        </div>
      </div>

      {/* Full preview card */}
      <div className="hb-card">
        <div className="hb-card-header">
          <div>
            <h3 style={{ margin: 0 }}>Pré-visualização do e-mail completo</h3>
            <p
              style={{
                fontSize: 12,
                color: "var(--color-muted-foreground, #6B7280)",
                margin: "2px 0 0",
              }}
            >
              Aparência do e-mail com o layout Hebron Aseec e valores de exemplo
            </p>
          </div>
        </div>
        <div className="hb-card-body">
          <EmailTemplatePreview
            subject={template.subject}
            bodyHtml={template.bodyHtml}
            variables={template.variables}
          />
        </div>
      </div>
    </div>
  );
}
