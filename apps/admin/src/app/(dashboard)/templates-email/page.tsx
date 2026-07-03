import Link from "next/link";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { resolveSession } from "@hebron/auth/server";
import { emailTemplates } from "@hebron/db/schema";
import type { EmailTemplateInput } from "@hebron/validators";
import type { EmailTemplate } from "@hebron/types/admin";
import { Mail, Check, AlertCircle } from "lucide-react";
import { EmailTemplateEditor } from "../../../components/email-template-editor";
import { EmailTemplatePreview } from "../../../components/email-template-preview";
import { logAudit } from "../../../lib/audit";

// ──────────────────────────────────────────────────────────────────────────────
// Template metadata
// ──────────────────────────────────────────────────────────────────────────────

type TemplateGroup = "Geral" | "Projetos";

type Slug =
  | "invitation"
  | "welcome"
  | "password-reset"
  | "projetos-submitted"
  | "projetos-in-validation"
  | "projetos-voting-open"
  | "projetos-approved"
  | "projetos-rejected"
  | "projetos-blocked"
  | "projetos-contested"
  | "projetos-evaluator-designated"
  | "projetos-payment-made"
  | "report-reminder-7d-before"
  | "report-reminder-due-today"
  | "report-reminder-expiry";

interface TemplateMeta {
  slug: Slug;
  label: string;
  description: string;
  variables: string[];
  group: TemplateGroup;
}

const TEMPLATE_META: TemplateMeta[] = [
  {
    slug: "invitation",
    label: "Convite de acesso",
    description: "Enviado ao convidar um novo usuário para a plataforma",
    variables: ["nome", "link", "papel"],
    group: "Geral",
  },
  {
    slug: "welcome",
    label: "Boas-vindas",
    description: "Enviado quando o convite é aceito e a conta é ativada",
    variables: ["nome", "link", "papel"],
    group: "Geral",
  },
  {
    slug: "password-reset",
    label: "Reset de senha",
    description: "Enviado ao solicitar redefinição de senha",
    variables: ["nome", "link"],
    group: "Geral",
  },
  {
    slug: "projetos-submitted",
    label: "Nova submissão",
    description: "Enviado a super_admins quando um projeto é submetido",
    variables: ["nome", "titulo", "submissor", "tipo", "organizacao", "link"],
    group: "Projetos",
  },
  {
    slug: "projetos-in-validation",
    label: "Projeto em análise",
    description: "Enviado ao submissor quando o projeto entra em validação",
    variables: ["nome", "titulo", "link"],
    group: "Projetos",
  },
  {
    slug: "projetos-voting-open",
    label: "Votação aberta",
    description: "Enviado a diretores e conselheiros quando a votação abre",
    variables: ["nome", "titulo", "link"],
    group: "Projetos",
  },
  {
    slug: "projetos-approved",
    label: "Projeto aprovado",
    description: "Enviado ao submissor após homologação com aprovação",
    variables: ["nome", "titulo", "link"],
    group: "Projetos",
  },
  {
    slug: "projetos-rejected",
    label: "Projeto não aprovado",
    description: "Enviado ao submissor após homologação com reprovação",
    variables: ["nome", "titulo", "link"],
    group: "Projetos",
  },
  {
    slug: "projetos-blocked",
    label: "Projeto bloqueado",
    description: "Enviado ao submissor e super_admins por falta de relatório",
    variables: ["nome", "titulo", "link"],
    group: "Projetos",
  },
  {
    slug: "projetos-contested",
    label: "Contestação",
    description: "Enviado a diretores e conselheiros quando há contestação",
    variables: ["nome", "titulo", "contestador", "link"],
    group: "Projetos",
  },
  {
    slug: "projetos-evaluator-designated",
    label: "Projetos designados",
    description: "Enviado ao avaliador 7 dias antes da reunião de votação",
    variables: ["nome", "titulo", "reuniao", "link"],
    group: "Projetos",
  },
  {
    slug: "projetos-payment-made",
    label: "Pagamento realizado",
    description: "Enviado ao submissor quando um pagamento é processado",
    variables: ["nome", "titulo", "valor", "data", "link"],
    group: "Projetos",
  },
  {
    slug: "report-reminder-7d-before",
    label: "Relatório: 7 dias",
    description: "Lembrete de relatório 7 dias antes do prazo",
    variables: ["nome", "titulo", "prazo", "link"],
    group: "Projetos",
  },
  {
    slug: "report-reminder-due-today",
    label: "Relatório: hoje",
    description: "Lembrete de relatório no dia do prazo",
    variables: ["nome", "titulo", "link"],
    group: "Projetos",
  },
  {
    slug: "report-reminder-expiry",
    label: "Relatório em atraso",
    description: "Lembrete de relatório 7 dias antes do prazo de expiração",
    variables: ["nome", "titulo", "prazo", "link"],
    group: "Projetos",
  },
];

const VALID_SLUGS = TEMPLATE_META.map((m) => m.slug);

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
  "projetos-submitted": {
    subject: "Nova submissão de projeto: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Um novo projeto foi submetido e aguarda validação.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F9FAFB;border-radius:8px;padding:16px;">
  <tr><td style="font-size:12px;color:#6B7280;width:140px;padding-bottom:6px;">Projeto</td><td style="font-size:13px;font-weight:700;padding-bottom:6px;">{{titulo}}</td></tr>
  <tr><td style="font-size:12px;color:#6B7280;padding-bottom:6px;">Submissor</td><td style="font-size:13px;padding-bottom:6px;">{{submissor}}</td></tr>
  <tr><td style="font-size:12px;color:#6B7280;padding-bottom:6px;">Tipo</td><td style="font-size:13px;padding-bottom:6px;">{{tipo}}</td></tr>
  <tr><td style="font-size:12px;color:#6B7280;">Organização</td><td style="font-size:13px;">{{organizacao}}</td></tr>
</table>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Revisar projeto</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nNova submissão: {{titulo}}\nSubmissor: {{submissor}}\nTipo: {{tipo}}\nOrganização: {{organizacao}}\n\nAcesse: {{link}}`,
  },
  "projetos-in-validation": {
    subject: "Projeto em análise: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Seu projeto <strong>{{titulo}}</strong> foi recebido e está sendo analisado pela equipe de administração da Hebron Aseec.</p>
<p>Você será notificado sobre o resultado da análise.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver projeto</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nSeu projeto "{{titulo}}" está sendo analisado pela administração.\n\nAcesse: {{link}}`,
  },
  "projetos-voting-open": {
    subject: "Votação aberta: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>O projeto <strong>{{titulo}}</strong> está na fase de votação e aguarda sua participação.</p>
<p>Acesse o portal para registrar sua avaliação antes da reunião.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Avaliar projeto</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO projeto "{{titulo}}" aguarda sua avaliação.\n\nAcesse: {{link}}`,
  },
  "projetos-approved": {
    subject: "Projeto aprovado: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Temos uma boa notícia: o projeto <strong>{{titulo}}</strong> foi aprovado pela diretoria da Hebron Aseec após o período de homologação.</p>
<p>Os pagamentos serão processados conforme o cronograma aprovado.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#16A34A;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver detalhes</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nSeu projeto "{{titulo}}" foi aprovado pela diretoria da Hebron Aseec.\n\nAcesse: {{link}}`,
  },
  "projetos-rejected": {
    subject: "Atualização sobre seu projeto: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Após análise pela diretoria, o projeto <strong>{{titulo}}</strong> não foi aprovado neste ciclo.</p>
<p>Entre em contato com a administração para mais informações ou para submeter um novo projeto.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver detalhes</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO projeto "{{titulo}}" não foi aprovado neste ciclo.\n\nAcesse: {{link}}`,
  },
  "projetos-blocked": {
    subject: "Projeto bloqueado: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>O projeto <strong>{{titulo}}</strong> foi bloqueado por falta de relatório. Os pagamentos estão suspensos até a entrega do relatório pendente.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#DC2626;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Enviar relatório</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO projeto "{{titulo}}" foi bloqueado por falta de relatório.\n\nAcesse: {{link}}`,
  },
  "projetos-contested": {
    subject: "Contestação de projeto: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Uma contestação foi registrada para o projeto <strong>{{titulo}}</strong> por <strong>{{contestador}}</strong>.</p>
<p>O projeto retorna para votação. Acesse o portal para participar.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#EA5A06;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver contestação</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\n{{contestador}} registrou uma contestação no projeto "{{titulo}}".\n\nAcesse: {{link}}`,
  },
  "projetos-evaluator-designated": {
    subject: "Projetos designados para avaliação: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Você foi designado para avaliar o projeto <strong>{{titulo}}</strong>.</p>
<p>A reunião de votação está agendada para <strong>{{reuniao}}</strong>. Acesse o portal para revisar os projetos com antecedência.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver projetos designados</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nVocê foi designado para avaliar "{{titulo}}".\nReunião: {{reuniao}}\n\nAcesse: {{link}}`,
  },
  "projetos-payment-made": {
    subject: "Pagamento realizado: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Um pagamento referente ao projeto <strong>{{titulo}}</strong> foi processado.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F9FAFB;border-radius:8px;padding:16px;">
  <tr><td style="font-size:12px;color:#6B7280;width:100px;padding-bottom:6px;">Valor</td><td style="font-size:20px;font-weight:700;color:#16A34A;padding-bottom:6px;">{{valor}}</td></tr>
  <tr><td style="font-size:12px;color:#6B7280;">Data</td><td style="font-size:13px;">{{data}}</td></tr>
</table>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver extrato do projeto</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nPagamento processado para o projeto "{{titulo}}".\nValor: {{valor}}\nData: {{data}}\n\nAcesse: {{link}}`,
  },
  "report-reminder-7d-before": {
    subject: "Relatório vence em 7 dias: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>O relatório do projeto <strong>{{titulo}}</strong> deve ser entregue até <strong>{{prazo}}</strong>. Você ainda tem 7 dias.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Enviar relatório</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO relatório do projeto "{{titulo}}" vence em {{prazo}}.\n\nAcesse: {{link}}`,
  },
  "report-reminder-due-today": {
    subject: "Relatório vence hoje: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>O prazo para entrega do relatório do projeto <strong>{{titulo}}</strong> é <strong>hoje</strong>.</p>
<p>Envie seu relatório agora para evitar o bloqueio de pagamentos.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#EA5A06;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Enviar relatório</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO relatório do projeto "{{titulo}}" vence HOJE.\n\nAcesse: {{link}}`,
  },
  "report-reminder-expiry": {
    subject: "Relatório em atraso: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>O relatório do projeto <strong>{{titulo}}</strong> está em atraso. O prazo final de expiração é <strong>{{prazo}}</strong>.</p>
<p>Após esta data, os pagamentos poderão ser bloqueados permanentemente.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#DC2626;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Enviar relatório urgente</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO relatório do projeto "{{titulo}}" está em atraso. Prazo de expiração: {{prazo}}.\n\nAcesse: {{link}}`,
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
  async function saveTemplate(data: EmailTemplateInput) {
    "use server";

    const cookieStore = await cookies();
    const { actorId, roles } = await resolveSession(cookieStore);

    if (!roles.includes("super_admin")) {
      throw new Error(
        "Acesso negado: apenas super_admin pode editar templates",
      );
    }

    const allText = `${data.subject} ${data.bodyHtml} ${data.bodyText}`;
    const vars = [
      ...new Set(
        (allText.match(/\{\{(\w+)\}\}/g) ?? []).map((m) => m.slice(2, -2)),
      ),
    ];

    await db
      .insert(emailTemplates)
      .values({
        slug: activeSlug,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        bodyText: data.bodyText,
        variables: vars,
        updatedBy: actorId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: emailTemplates.slug,
        set: {
          subject: data.subject,
          bodyHtml: data.bodyHtml,
          bodyText: data.bodyText,
          variables: vars,
          updatedBy: actorId,
          updatedAt: new Date(),
        },
      });

    await logAudit({
      actorId,
      action: "email_template.updated",
      entity: "email_template",
      diff: { slug: activeSlug, subject: data.subject },
    });

    revalidatePath("/templates-email");
  }

  // ── Styles ──────────────────────────────────────────────────────────────────

  const sidebarItemBase: React.CSSProperties = {
    display: "block",
    padding: "7px 12px",
    borderRadius: 6,
    fontSize: 13,
    textDecoration: "none",
    transition: "background 0.12s",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const groupHeaderStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "var(--color-muted-foreground, #6B7280)",
    padding: "12px 12px 4px",
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const groups: TemplateGroup[] = ["Geral", "Projetos"];

  return (
    <div className="hb-page">
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
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
            Textos padrão dos e-mails enviados pela plataforma. Editáveis apenas
            por super_admin.
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 210,
            flexShrink: 0,
            background: "var(--color-surface, #F9FAFB)",
            border: "1px solid var(--color-border, #E5E7EB)",
            borderRadius: 10,
            overflow: "hidden",
            position: "sticky",
            top: 16,
          }}
        >
          {groups.map((group) => {
            const items = TEMPLATE_META.filter((m) => m.group === group);
            return (
              <div key={group}>
                <div style={groupHeaderStyle}>{group}</div>
                {items.map((meta) => {
                  const active = meta.slug === activeSlug;
                  return (
                    <Link
                      key={meta.slug}
                      href={`/templates-email?tab=${meta.slug}`}
                      style={{
                        ...sidebarItemBase,
                        color: active
                          ? "var(--color-primary, #202C85)"
                          : "var(--color-foreground, #111827)",
                        background: active
                          ? "var(--color-primary-50, #EFF2FF)"
                          : "transparent",
                        fontWeight: active ? 600 : 400,
                      }}
                      aria-current={active ? "page" : undefined}
                    >
                      {meta.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </aside>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Status badge */}
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
              <EmailTemplateEditor
                template={template}
                onSubmit={saveTemplate}
              />
            </div>
          </div>

          {/* Preview card */}
          <div className="hb-card">
            <div className="hb-card-header">
              <div>
                <h3 style={{ margin: 0 }}>
                  Pré-visualização do e-mail completo
                </h3>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--color-muted-foreground, #6B7280)",
                    margin: "2px 0 0",
                  }}
                >
                  Aparência do e-mail com o layout Hebron Aseec e valores de
                  exemplo
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
      </div>
    </div>
  );
}
